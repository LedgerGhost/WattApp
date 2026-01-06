const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
    {
      pointid: {
        type: String,
        required: [true, 'Point ID is required'],
        trim: true,
        index: true
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        index: true
      },
      startTime: {
        type: Date,
        required: true,
        default: Date.now
      },
      endTime: {
        type: Date,
        required: true
      },
      durationMinutes: {
        type: Number,
        required: true,
        min: 1,
        max: 60,
        default: 30
      },
      status: {
        type: String,
        enum: {
          values: ['active', 'completed', 'cancelled', 'expired', 'converted'],
          message: 'Invalid reservation status'
        },
        default: 'active',
        index: true
      },
      sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChargingSession',
        default: null
      },
      cancelledAt: {
        type: Date,
        default: null
      },
      cancelReason: {
        type: String,
        trim: true,
        maxlength: 255
      }
    },
    {
      timestamps: true,
      collection: 'reservations'
    }
);

// Indexes
reservationSchema.index({ userId: 1, status: 1 });
reservationSchema.index({ pointid: 1, status: 1 });
reservationSchema.index({ endTime: 1, status: 1 });
reservationSchema.index({ status: 1, endTime: 1 });

// Virtuals
reservationSchema.virtual('isExpired').get(function () {
  return this.status === 'active' && new Date() > this.endTime;
});

reservationSchema.virtual('remainingMinutes').get(function () {
  if (this.status !== 'active') return 0;
  const remaining = (this.endTime - new Date()) / (1000 * 60);
  return Math.max(0, Math.round(remaining));
});

// Helper
function formatTimestamp(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// Instance methods
reservationSchema.methods.toActiveResponse = function () {
  return {
    pointid: this.pointid,
    reservationendtime: formatTimestamp(this.endTime)
  };
};

reservationSchema.methods.isActive = function () {
  return this.status === 'active' && new Date() <= this.endTime;
};

reservationSchema.methods.cancel = async function (reason = null) {
  if (this.status !== 'active') {
    throw new Error('Can only cancel active reservations');
  }
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelReason = reason;
  return this.save();
};

reservationSchema.methods.markExpired = async function () {
  if (this.status !== 'active') {
    throw new Error('Can only expire active reservations');
  }
  this.status = 'expired';
  return this.save();
};

reservationSchema.methods.convertToSession = async function (sessionId) {
  if (this.status !== 'active') {
    throw new Error('Can only convert active reservations');
  }
  this.status = 'converted';
  this.sessionId = sessionId;
  return this.save();
};

reservationSchema.methods.complete = async function () {
  this.status = 'completed';
  return this.save();
};

// Static methods
reservationSchema.statics.createReservation = async function (pointid, userId, minutes = 30) {
  const actualMinutes = Math.min(Math.max(minutes, 1), 60);
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + actualMinutes * 60 * 1000);

  const existingActive = await this.findActiveByUser(userId);
  if (existingActive) {
    throw new Error('User already has an active reservation');
  }

  return this.create({
    pointid,
    userId,
    startTime,
    endTime,
    durationMinutes: actualMinutes,
    status: 'active'
  });
};

reservationSchema.statics.findActiveByUser = async function (userId) {
  return this.findOne({
    userId,
    status: 'active',
    endTime: { $gt: new Date() }
  });
};

reservationSchema.statics.findActiveByPoint = async function (pointid) {
  return this.findOne({
    pointid,
    status: 'active',
    endTime: { $gt: new Date() }
  });
};

reservationSchema.statics.cancelActiveByUser = async function (userId, reason = null) {
  const reservation = await this.findActiveByUser(userId);
  if (!reservation) return null;
  await reservation.cancel(reason);
  return reservation;
};

reservationSchema.statics.findExpired = function () {
  return this.find({
    status: 'active',
    endTime: { $lt: new Date() }
  });
};

reservationSchema.statics.processExpired = async function () {
  const expired = await this.findExpired();
  let count = 0;
  for (const reservation of expired) {
    await reservation.markExpired();
    count++;
  }
  return count;
};

reservationSchema.statics.getUserHistory = function (userId, limit = 50) {
  return this.find({ userId }).sort({ createdAt: -1 }).limit(limit);
};

reservationSchema.statics.getPointStatistics = async function (pointid, fromDate, toDate) {
  const result = await this.aggregate([
    {
      $match: {
        pointid,
        startTime: { $gte: fromDate, $lte: toDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgDuration: { $avg: '$durationMinutes' }
      }
    }
  ]);

  return {
    pointid,
    fromDate,
    toDate,
    byStatus: result.reduce((acc, item) => {
      acc[item._id] = {
        count: item.count,
        avgDuration: Math.round(item.avgDuration)
      };
      return acc;
    }, {})
  };
};

reservationSchema.statics.formatTimestamp = formatTimestamp;

const Reservation = mongoose.model('Reservation', reservationSchema);

module.exports = Reservation;

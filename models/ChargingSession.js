const mongoose = require('mongoose');

const chargingSessionSchema = new mongoose.Schema(
    {
      pointid: {
        type: Number,
        required: [true, 'Point ID is required'],
        index: true
      },
      starttime: {
        type: Date,
        required: [true, 'Start time is required']
      },
      endtime: {
        type: Date,
        required: [true, 'End time is required'],
        validate: {
          validator: function (v) {
            return v > this.starttime;
          },
          message: 'End time must be after start time'
        }
      },
      startsoc: {
        type: Number,
        required: [true, 'Start SOC is required'],
        min: [0, 'Start SOC must be >= 0'],
        max: [100, 'Start SOC must be <= 100']
      },
      endsoc: {
        type: Number,
        required: [true, 'End SOC is required'],
        min: [0, 'End SOC must be >= 0'],
        max: [100, 'End SOC must be <= 100'],
        validate: {
          validator: function (v) {
            return v >= this.startsoc;
          },
          message: 'End SOC should be >= Start SOC'
        }
      },
      totalkwh: {
        type: Number,
        required: [true, 'Total kWh is required'],
        min: [0, 'Total kWh must be positive']
      },
      kwhprice: {
        type: Number,
        required: [true, 'kWh price is required'],
        min: [0, 'kWh price must be positive']
      },
      amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0, 'Amount must be positive']
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },
      reservationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reservation',
        default: null
      }
    },
    {
      timestamps: true,
      collection: 'sessions_api'
    }
);

// Indexes
chargingSessionSchema.index({ pointid: 1, starttime: -1 });
chargingSessionSchema.index({ starttime: -1 });
chargingSessionSchema.index({ userId: 1 });
chargingSessionSchema.index({ pointid: 1, starttime: 1, endtime: 1 });

// Helpers
function formatTimestamp(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function parseTimestamp(timestamp) {
  if (timestamp instanceof Date) return timestamp;
  const match = String(timestamp).match(
      /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/
  );
  if (match) {
    const [, year, month, day, hours, minutes] = match;
    return new Date(
        parseInt(year, 10),
        parseInt(month, 10) - 1,
        parseInt(day, 10),
        parseInt(hours, 10),
        parseInt(minutes, 10)
    );
  }
  return new Date(timestamp);
}

function parseDateYYYYMMDD(dateStr, endOfDay = false) {
  const m = String(dateStr).match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!m) return null;
  const [, year, month, day] = m;
  if (endOfDay) {
    return new Date(year, parseInt(month) - 1, parseInt(day), 23, 59, 59, 999);
  }
  return new Date(year, parseInt(month) - 1, parseInt(day), 0, 0, 0, 0);
}

// Virtuals
chargingSessionSchema.virtual('durationMinutes').get(function () {
  if (!this.starttime || !this.endtime) return 0;
  return Math.round((this.endtime - this.starttime) / (1000 * 60));
});

chargingSessionSchema.virtual('avgPower').get(function () {
  const durationHours = this.durationMinutes / 60;
  if (durationHours === 0) return 0;
  return this.totalkwh / durationHours;
});

chargingSessionSchema.virtual('socGain').get(function () {
  return this.endsoc - this.startsoc;
});

// Instance methods
chargingSessionSchema.methods.toSessionResponse = function () {
  return {
    starttime: formatTimestamp(this.starttime),
    endtime: formatTimestamp(this.endtime),
    startsoc: this.startsoc,
    endsoc: this.endsoc,
    totalkwh: this.totalkwh,
    kwhprice: this.kwhprice,
    amount: this.amount
  };
};

chargingSessionSchema.methods.toCSVRow = function () {
  return [
    formatTimestamp(this.starttime),
    formatTimestamp(this.endtime),
    this.startsoc,
    this.endsoc,
    this.totalkwh,
    this.kwhprice,
    this.amount
  ].join(',');
};

// Static methods
chargingSessionSchema.statics.createSession = async function (sessionData) {
  const parsedData = {
    ...sessionData,
    starttime: parseTimestamp(sessionData.starttime),
    endtime: parseTimestamp(sessionData.endtime)
  };
  const session = new this(parsedData);
  return session.save();
};

chargingSessionSchema.statics.findByPointAndDateRange = function (
    pointid,
    from,
    to
) {
  const fromDate = parseDateYYYYMMDD(from);
  const toDate = parseDateYYYYMMDD(to, true);
  if (!fromDate || !toDate) {
    throw new Error('Invalid date format. Use YYYYMMDD');
  }
  return this.find({
    pointid,
    starttime: { $gte: fromDate, $lte: toDate }
  }).sort({ starttime: 1 });
};

chargingSessionSchema.statics.calculateRevenue = async function (
    pointid,
    fromDate,
    toDate
) {
  const result = await this.aggregate([
    {
      $match: {
        pointid,
        starttime: { $gte: fromDate, $lte: toDate }
      }
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        totalKwh: { $sum: '$totalkwh' },
        sessions: { $sum: 1 }
      }
    }
  ]);

  if (!result.length) {
    return {
      pointid,
      fromDate,
      toDate,
      totalAmount: 0,
      totalKwh: 0,
      sessions: 0
    };
  }

  const stats = result[0];
  return {
    pointid,
    fromDate,
    toDate,
    totalAmount: stats.totalAmount,
    totalKwh: stats.totalKwh,
    sessions: stats.sessions
  };
};

chargingSessionSchema.statics.toCSV = function (sessions) {
  return sessions
      .map((s) =>
          [
            s.starttime,
            s.endtime,
            s.startsoc,
            s.endsoc,
            s.totalkwh,
            s.kwhprice,
            s.amount
          ].join(',')
      )
      .join('\n');
};

chargingSessionSchema.statics.formatTimestamp = formatTimestamp;
chargingSessionSchema.statics.parseTimestamp = parseTimestamp;
chargingSessionSchema.statics.parseDateYYYYMMDD = parseDateYYYYMMDD;

const ChargingSession = mongoose.model(
    'ChargingSession',
    chargingSessionSchema
);

module.exports = ChargingSession;
module.exports.formatTimestamp = formatTimestamp;
module.exports.parseTimestamp = parseTimestamp;
module.exports.parseDateYYYYMMDD = parseDateYYYYMMDD;

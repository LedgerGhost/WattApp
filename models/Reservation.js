// models/Reservation.js
const mongoose = require("mongoose");
const crypto = require('crypto');


const reservationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
   
    pointid: {
      type: Number,
      required: true,
      index: true,
    },
   
    start_time: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    end_time: {
      type: Date,
      required: true,
      index: true,
    },
    duration_minutes: {
      type: Number,
      required: true,
      min: 1,
      // max: 60,
      default: 30,
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled", "expired", "converted"],
      default: "active",
      index: true,
    },
    
    reservation_fee: {
      type: Number,
      default: 0.5,
      min: 0,
    },
    fee_charged: {
      type: Boolean,
      default: true,
    },
    payment_token: {
      type: String,
      trim: true,
      default: () => crypto.randomBytes(16).toString('hex'),
    },
    
  },
  {
    collection: "reservations",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    strict: true,
    versionKey: false,
  }
);

reservationSchema.index({ user_id: 1, status: 1 });
reservationSchema.index({ pointid: 1, status: 1 });
reservationSchema.index({ end_time: 1, status: 1 });
reservationSchema.index({ status: 1, end_time: 1 });

reservationSchema.statics.findActiveByPoint = function (pointid) {
  return this.findOne({
    pointid: Number(pointid),
    status: "active",
    end_time: { $gt: new Date() },
  });
};

reservationSchema.statics.findActiveByUser = function (userId) {
  return this.findOne({
    user_id: userId,
    status: "active",
    end_time: { $gt: new Date() },
  });
};

reservationSchema.statics.createReservation = async function (pointid, userId, minutes = 30, uniquePerUser = false) {
  const actualMinutes = Math.min(Math.max(Number(minutes) || 30, 1), 60);
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + actualMinutes * 60 * 1000);

  if(uniquePerUser) {
    const existingActive = await this.findActiveByUser(userId);
    if (existingActive) {
      const err = new Error("User already has an active reservation");
      err.code = "ACTIVE_RESERVATION_EXISTS";
      throw err;
    }
  }

  return this.create({
    pointid: Number(pointid),
    user_id: userId,
    start_time: startTime,
    end_time: endTime,
    duration_minutes: actualMinutes,
    status: "active",
  });
};


/**
 * Cancel an active reservation and release the point
 * @param {Model} Point - The Point model
 * @param {Model} PointStatusHistory - Optional history model for logging
 */
reservationSchema.methods.cancel = async function(PointStatusHistory = null) {
  if (this.status !== 'active') {
    const err = new Error(`Cannot cancel reservation with status '${this.status}'`);
    err.code = 'INVALID_STATUS_TRANSITION';
    throw err;
  }
  const Point = mongoose.model('Point');
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction({
          readPreference: 'primary',
          readConcern: { level: 'local' },
          writeConcern: { w: 'majority' }
    });
    // Update reservation status
    this.status = 'cancelled';
    await this.save({ session });

    // Release the point
    const point = await Point.findOne({ pointid: this.pointid }).session(session);
    if (point && point.status === 'reserved') {
      point.status = 'available';
      point.reservationendtime = null;
      point.reservedBy = null;
      point.lastStatusChange = new Date();
      await point.save({ session });

      if (PointStatusHistory) {
        await PointStatusHistory.logStatusChange(
          this.pointid,
          'reserved',
          'available',
          this.user_id,
          'Reservation cancelled by user'
        );
      }
    }

    await session.commitTransaction();
    return this;

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Complete a reservation using user's timestamp
 * @param {Date} userTimestamp - The timestamp when user completed the session
 * @param {Model} Point - The Point model
 * @param {Model} PointStatusHistory - Optional history model
 */
reservationSchema.methods.complete = async function(userTimestamp, Point, PointStatusHistory = null) {
  if (this.status !== 'active') {
    const err = new Error(`Cannot complete reservation with status '${this.status}'`);
    err.code = 'INVALID_STATUS_TRANSITION';
    throw err;
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Update reservation
    this.status = 'completed';
    this.end_time = userTimestamp || new Date();
    await this.save({ session });

    // Release the point
    const point = await Point.findOne({ pointid: this.pointid }).session(session);
    if (point && point.status === 'reserved') {
      point.status = 'available';
      point.reservationendtime = null;
      point.reservedBy = null;
      point.lastStatusChange = new Date();
      await point.save({ session });

      if (PointStatusHistory) {
        await PointStatusHistory.logStatusChange(
          this.pointid,
          'reserved',
          'available',
          this.user_id,
          'Reservation completed by user'
        );
      }
    }

    await session.commitTransaction();
    return this;

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};


/**
 * Create reservation AND update point status to reserved
 */
reservationSchema.statics.createReservationWithPointUpdate = async function(pointid, userId, minutes, Point, PointStatusHistory = null) {
  const actualMinutes = Math.min(Math.max(Number(minutes) || 30, 1), 60);
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + actualMinutes * 60 * 1000);

  // Check user doesn't have active reservation
  const existingActive = await this.findActiveByUser(userId);
  if (existingActive) {
    const err = new Error("User already has an active reservation");
    err.code = "ACTIVE_RESERVATION_EXISTS";
    throw err;
  }

  // Check point exists and is available
  const point = await Point.findOne({ pointid: Number(pointid) });
  if (!point) {
    const err = new Error("Point not found");
    err.code = "POINT_NOT_FOUND";
    throw err;
  }
  if (point.status !== 'available') {
    const err = new Error(`Point is not available (current status: ${point.status})`);
    err.code = "POINT_NOT_AVAILABLE";
    throw err;
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Create reservation
    const [reservation] = await this.create([{
      pointid: Number(pointid),
      user_id: userId,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: actualMinutes,
      status: "active",
    }], { session });

    // Update point to reserved
    point.status = 'reserved';
    point.reservationendtime = endTime;
    point.reservedBy = userId;
    point.lastStatusChange = startTime;
    await point.save({ session });

    if (PointStatusHistory) {
      await PointStatusHistory.logStatusChange(
        pointid,
        'available',
        'reserved',
        userId,
        `Reserved for ${actualMinutes} minutes`
      );
    }

    await session.commitTransaction();
    return reservation;

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Cancel reservation by ID
 */
reservationSchema.statics.cancelById = async function(reservationId, userId, Point, PointStatusHistory = null) {
  const reservation = await this.findOne({
    _id: reservationId,
    user_id: userId,
    status: 'active'
  });

  if (!reservation) {
    const err = new Error('Active reservation not found');
    err.code = 'RESERVATION_NOT_FOUND';
    throw err;
  }

  return reservation.cancel(Point, PointStatusHistory);
};

reservationSchema.statics.cancelByUser = async function(userId, Point, PointStatusHistory = null) {
  const reservation = await this.findOne({
    user_id: userId,
    status: 'active'
  });

  if (!reservation) {
    const err = new Error('Active reservation not found');
    err.code = 'RESERVATION_NOT_FOUND';
    throw err;
  }

  return reservation.cancel(Point, PointStatusHistory);
};

/**
 * Complete reservation by ID with user timestamp
 */
reservationSchema.statics.completeById = async function(reservationId, userId, userTimestamp, Point, PointStatusHistory = null) {
  const reservation = await this.findOne({
    _id: reservationId,
    user_id: userId,
    status: 'active'
  });

  if (!reservation) {
    const err = new Error('Active reservation not found');
    err.code = 'RESERVATION_NOT_FOUND';
    throw err;
  }

  return reservation.complete(userTimestamp, Point, PointStatusHistory);
};

/**
 * Expire overdue reservations and release points
 */
reservationSchema.statics.expireOverdue = async function(PointStatusHistory = null) {
  const Point = mongoose.model('Point');
  const now = new Date();
  
  const overdueReservations = await this.find({
    status: 'active',
    end_time: { $lt: now }
  });

  let expiredCount = 0;

  for (const reservation of overdueReservations) {
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction({
        readPreference: 'primary',
        readConcern: { level: 'local' },
        writeConcern: { w: 'majority' }
      });

      reservation.status = 'expired';
      await reservation.save({ session });

      const point = await Point.findOne({ pointid: reservation.pointid }).session(session);
      if (point && point.status === 'reserved') {
        point.status = 'available';
        point.reservationendtime = null;
        point.reservedBy = null;
        point.lastStatusChange = now;
        await point.save({ session });

        if (PointStatusHistory) {
          await PointStatusHistory.logStatusChange(
            reservation.pointid,
            'reserved',
            'available',
            reservation.user_id,
            'Reservation expired automatically'
          );
        }
      }

      await session.commitTransaction();
      expiredCount++;

    } catch (error) {
      await session.abortTransaction();
      console.error(`Failed to expire reservation ${reservation._id}:`, error.message);
    } finally {
      session.endSession();
    }
  }

  return expiredCount;
};

//  Handle reservation status updates based on Point status transitions.
//  ADMIN LOGIC:
//    - If user is Admin: Cancel ANY active reservation on this point immediately.
//  CUSTOMER LOGIC:
//    - reserved -> charging  : Mark OWN reservation as 'completed'
//    - reserved -> available : Mark OWN reservation as 'cancelled'
//    - Others                : Ignore
reservationSchema.statics.handlePointStatusChange = async function (pointId, userId, oldPointStatus, newPointStatus) {
  
  // Check if the user triggering the change is an ADMIN
  let isAdmin = false;
  if (userId) {
    const user = await User.findById(userId);
    if (user && user.role === 'admin') {
      isAdmin = true;
    }
  }

  // ADMIN FLOW: Force cancel ANY active reservation on this point
  if (isAdmin) {
    await this.updateMany(
      { 
        pointid: Number(pointId), 
        status: 'active' 
      },
      { 
        $set: { status: 'cancelled' } 
      }
    );
    return; // Stop here, admin overrides everything else
  }

  // CUSTOMER/NORMAL FLOW (Your original logic)
  // We only act if the point was previously 'reserved'
  if (oldPointStatus !== 'reserved') return;

  let newReservationStatus = null;
  const updateData = {};

  if (newPointStatus === 'charging') {
    newReservationStatus = 'completed';
    updateData.end_time = new Date(); // Set actual completion time
  } else if (newPointStatus === 'available') {
    newReservationStatus = 'cancelled';
  }

  // If the transition matches our criteria, update the specific user's reservation
  if (newReservationStatus) {
    updateData.status = newReservationStatus;

    await this.updateOne(
      {
        pointid: Number(pointId),
        user_id: userId, // CRITICAL: Only update this specific user's reservation
        status: 'active'
      },
      {
        $set: updateData
      }
    );
  }
};

module.exports = mongoose.model("Reservation", reservationSchema);

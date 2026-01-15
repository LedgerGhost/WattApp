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
      max: 60,
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

reservationSchema.statics.createReservation = async function (pointid, userId, minutes = 30) {
  const actualMinutes = Math.min(Math.max(Number(minutes) || 30, 1), 60);
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + actualMinutes * 60 * 1000);

  const existingActive = await this.findActiveByUser(userId);
  if (existingActive) {
    const err = new Error("User already has an active reservation");
    err.code = "ACTIVE_RESERVATION_EXISTS";
    throw err;
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

module.exports = mongoose.model("Reservation", reservationSchema);

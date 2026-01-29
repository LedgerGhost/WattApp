const mongoose = require("mongoose");

// Sub-schemas
const chargingDataPointSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, required: true },
    state_of_charge: { type: Number, required: true, min: 0, max: 100 },
    power_kw: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const meterReadingsSchema = new mongoose.Schema(
  {
    start_meter: { type: Number, required: true },
    end_meter: { type: Number, required: true }
  },
  { _id: false }
);

const costSchema = new mongoose.Schema(
  {
    energy_cost: { type: Number, min: 0, default: null },
    idle_fee: { type: Number, default: 0, min: 0 },
    connection_fee: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    total: { type: Number, min: 0, default: null },
    currency: { type: String, default: "EUR" }
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    preauthorization_amount: { type: Number, min: 0, default: null },
    preauthorization_id: { type: String, default: null },
    preauthorization_time: { type: Date, default: null },
    final_charge_amount: { type: Number, min: 0, default: null },
    payment_id: { type: String, default: null },
    payment_time: { type: Date, default: null },
    payment_method_token: { type: String, default: null },
    payment_status: {
      type: String,
      enum: ["pending", "authorized", "captured", "failed", "refunded"],
      default: null
    }
  },
  { _id: false }
);

const vehicleInfoSchema = new mongoose.Schema(
  {
    battery_level_start: { type: Number, min: 0, max: 100, default: null },
    battery_level_end: { type: Number, min: 0, max: 100, default: null }
  },
  { _id: false }
);

// Main schema (canonical fields ONLY)
const chargingSessionSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },

    station_id: { type: String, default: null, index: true },

    pointid: {
      type: Number,
      required: [true, "Point ID is required"],
      index: true
    },

    outlet_id: { type: String, default: null },

    reservation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reservation",
      default: null
    },

    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "failed", "cancelled"],
      default: "completed",
      index: true
    },

    start_time: { type: Date, required: [true, "Start time is required"] },

    end_time: {
      type: Date,
      default: null,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return v > this.start_time;
        },
        message: "End time must be after start time"
      }
    },

    duration_minutes: { type: Number, min: 0, default: null },

    energy_delivered_kwh: { type: Number, min: 0, default: null },

    meter_readings: { type: meterReadingsSchema, default: null },

    charging_data: { type: [chargingDataPointSchema], default: [] },

    cost: { type: costSchema, default: null },

    payment: { type: paymentSchema, default: null },

    stop_reason: {
      type: String,
      enum: [
        "target_soc_reached",
        "user_stopped",
        "time_limit_reached",
        "error",
        "vehicle_disconnected",
        "power_limit_reached",
        "scheduled_end",
        // αν στο Compass έχεις "battery_full", βάλε το για να μην απορρίπτεται
        "battery_full"
      ],
      default: null
    },

    vehicle_info: { type: vehicleInfoSchema, default: null },

    ocpp_transaction_id: { type: String, default: null, index: true }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "charging_sessions"
  }
);

// Indexes
chargingSessionSchema.index({ station_id: 1, start_time: -1 });
chargingSessionSchema.index({ pointid: 1, start_time: -1 });
chargingSessionSchema.index({ start_time: -1 });
chargingSessionSchema.index({ user_id: 1, start_time: -1 });
chargingSessionSchema.index({ pointid: 1, start_time: 1, end_time: 1 });
chargingSessionSchema.index({ status: 1, start_time: -1 });

const ChargingSession = mongoose.model("ChargingSession", chargingSessionSchema);

module.exports = ChargingSession;

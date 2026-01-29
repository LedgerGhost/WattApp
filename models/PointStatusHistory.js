const mongoose = require('mongoose');
const { parseDateYYYYMMDD, formatTimestamp } = require('../utils/dateUtils');

const VALID_STATUSES = ['available', 'charging', 'reserved', 'malfunction', 'offline'];

const pointStatusHistorySchema = new mongoose.Schema(
    {
      pointid: {
        type: Number,
        required: [true, 'Point ID is required'],
        trim: true,
        index: true
      },
      timeref: {
        type: Date,
        required: [true, 'Time reference is required'],
        default: Date.now
      },
      old_state: {
        type: String,
        required: [true, 'Old state is required'],
        enum: {
          values: VALID_STATUSES,
          message: 'Old state must be a valid status'
        }
      },
      new_state: {
        type: String,
        required: [true, 'New state is required'],
        enum: {
          values: VALID_STATUSES,
          message: 'New state must be a valid status'
        }
      },
      triggeredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },
      reason: {
        type: String,
        trim: true,
        maxlength: 255
      }
    },
    {
      timestamps: true,
      collection: 'point_status_history'
    }
);

// Indexes
pointStatusHistorySchema.index({ pointid: 1, timeref: -1 });
pointStatusHistorySchema.index({ timeref: -1 });
pointStatusHistorySchema.index({ old_state: 1, new_state: 1 });

// Instance methods
pointStatusHistorySchema.methods.toStatusResponse = function () {
  return {
    timeref: formatTimestamp(this.timeref),
    old_state: this.old_state,
    new_state: this.new_state
  };
};

pointStatusHistorySchema.methods.toCSVRow = function () {
  return [formatTimestamp(this.timeref), this.old_state, this.new_state].join(',');
};

// Static methods
pointStatusHistorySchema.statics.logStatusChange = function (
    pointid,
    oldState,
    newState,
    triggeredBy = null,
    reason = null
) {
  return this.create({
    pointid,
    timeref: new Date(),
    old_state: oldState,
    new_state: newState,
    triggeredBy,
    reason
  });
};

pointStatusHistorySchema.statics.findByPointAndDateRange = async function (
    pointid,
    from,
    to
) {
  const fromDate = parseDateYYYYMMDD(from);
  const toDate = parseDateYYYYMMDD(to, true);
  if (!fromDate || !toDate) {
    throw new Error('Invalid date format. Use YYYYMMDD');
  }
  if (fromDate > toDate) {
    throw new Error('From date must be before or equal to To date');
  }

  const history = await this.find({
    pointid,
    timeref: { $gte: fromDate, $lte: toDate }
  }).sort({ timeref: -1 });

  return history.map((h) => h.toStatusResponse());
};

pointStatusHistorySchema.statics.getRecentChanges = function (pointid, limit = 10) {
  return this.find({ pointid }).sort({ timeref: -1 }).limit(limit);
};

pointStatusHistorySchema.statics.toCSV = function (history) {
  return history
      .map((h) =>
          [h.timeref, h.old_state, h.new_state].join(',')
      )
      .join('\n');
};

const PointStatusHistory = mongoose.model(
    'PointStatusHistory',
    pointStatusHistorySchema
);

module.exports = PointStatusHistory;
module.exports.formatTimestamp = formatTimestamp;
module.exports.parseDateYYYYMMDD = parseDateYYYYMMDD;
module.exports.VALID_STATUSES = VALID_STATUSES;

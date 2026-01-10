const mongoose = require('mongoose');

const VALID_STATUSES = ['available', 'charging', 'reserved', 'malfunction', 'offline'];
const ONLINE_STATUSES = ['available', 'charging', 'reserved', 'malfunction'];

const pointSchema = new mongoose.Schema(
    {
      pointid: {
        type: Number,
        required: [true, 'Point ID is required'],
        unique: true,
        trim: true,
        validate: {
          validator: function(v) {
              return !isNaN(v); // Stops NaN (e.g. from failed parseInt)
          },
          message: props => `${props.value} is not a valid Point ID!`
        } 
      },
      providerName: {
        type: String,
        required: [true, 'Provider name is required'],
        trim: true,
        default: "Unknown"
      },
      lon: {
        type: String,
        required: [true, 'Longitude is required'],
        validate: {
          validator: function (v) {
            const num = parseFloat(v);
            return !isNaN(num) && num >= -180 && num <= 180;
          },
          message: 'Longitude must be a valid number between -180 and 180'
        }
      },
      lat: {
        type: String,
        required: [true, 'Latitude is required'],
        validate: {
          validator: function (v) {
            const num = parseFloat(v);
            return !isNaN(num) && num >= -90 && num <= 90;
          },
          message: 'Latitude must be a valid number between -90 and 90'
        }
      },
      location: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point'
        },
        coordinates: {
          type: [Number],
        }
      },
      status: {
        type: String,
        required: [true, 'Status is required'],
        enum: {
          values: VALID_STATUSES,
          message:
              'Status must be one of: available, charging, reserved, malfunction, offline'
        },
        default: 'available'
      },
      cap: {
        type: Number,
        required: [true, 'Capacity (cap) is required'],
        min: [0, 'Capacity must be positive']
      },
      kwhprice: {
        type: Number,
        required: [true, 'kWh price is required'],
        min: [0, 'Price must be positive'],
        default: 0.30
      },
      reservationendtime: {
        type: Date,
        default: null
      },
      reservedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      lastStatusChange: {
        type: Date,
      },
      address: {
        type: String,
        trim: true,
        default: "Unknown"
      },
      station_name: {
        type: String,
        trim: true,
        default: "Unknown"
      },
      external_station_id: {
        type: String,
        trim: true,
        default: "Unknown"
      },
      connector_type: {
        type: String,
        trim: true,
        default: "Unknown"
      },
    },
    {
      timestamps: true,
      collection: 'charge_points'
    }
);

// Indexes
pointSchema.index({ pointid: 1 }, { unique: true });
pointSchema.index({ status: 1 });
pointSchema.index({ providerName: 1 });
pointSchema.index({ location: '2dsphere' });
pointSchema.index({ reservationendtime: 1 });

// Pre-save sync location
pointSchema.pre('validate', function (next) {
  // Check if lon/lat exist and location is missing or needs update
  if (this.lon && this.lat) {
    this.location = {
      type: 'Point',
      coordinates: [parseFloat(this.lon), parseFloat(this.lat)]
    };
  }
  next();
});

pointSchema.pre('save', function (next) {
  if (this.lon && this.lat) {
    this.location = {
      type: 'Point',
      coordinates: [parseFloat(this.lon), parseFloat(this.lat)]
    };
  }
  next();
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
pointSchema.methods.isOnline = function () {
  return ONLINE_STATUSES.includes(this.status);
};

pointSchema.methods.isAvailable = function () {
  return this.status === 'available';
};

pointSchema.methods.isReserved = function () {
  return this.status === 'reserved';
};

pointSchema.methods.reserve = async function (
    minutes,
    userId,
    PointStatusHistory
) {
  if (!this.isAvailable()) {
    throw new Error('Point is not available for reservation');
  }

  const now = new Date();
  const endTime = new Date(now.getTime() + minutes * 60 * 1000);

  this.status = 'reserved';
  this.reservationendtime = endTime;
  this.reservedBy = userId;
  this.lastStatusChange = now;
  await this.save();

  if (PointStatusHistory) {
    await PointStatusHistory.logStatusChange(
        this.pointid,
        'available',
        'reserved',
        userId,
        `Reserved for ${minutes} minutes`
    );
  }

  return this;
};

pointSchema.methods.updateStatus = async function (newStatus, PointStatusHistory, reason = null) {
  if (!VALID_STATUSES.includes(newStatus)) {
    throw new Error('Invalid status value');
  }

  const oldStatus = this.status;
  this.status = newStatus;
  this.lastStatusChange = new Date();

  if (newStatus !== 'reserved') {
    this.reservationendtime = null;
    this.reservedBy = null;
  }

  await this.save();

  if (PointStatusHistory) {
    await PointStatusHistory.logStatusChange(
        this.pointid,
        oldStatus,
        newStatus,
        null,
        reason
    );
  }

  return this;
};

pointSchema.methods.toPointsList = function () {
  return {
    providerName: this.providerName,
    pointid: this.pointid,
    lon: this.lon,
    lat: this.lat,
    status: this.status,
    cap: this.cap
  };
};

pointSchema.methods.toPointDetails = function () {
  return {
    providerName: this.providerName,
    pointid: this.pointid,
    lon: this.lon,
    lat: this.lat,
    status: this.status,
    cap: this.cap,
    kwhprice: this.kwhprice,
    reservationendtime: this.reservationendtime
        ? formatTimestamp(this.reservationendtime)
        : null
  };
};

// Static methods
pointSchema.statics.findByPointId = function (pointid) {
  return this.findOne({ pointid });
};

pointSchema.statics.getPoints = function (status = null) {
  const query = {};
  if (status) {
    query.status = status;
  }
  return this.find(query);
};

pointSchema.statics.getPointCounts = async function () {
  const total = await this.countDocuments();
  const online = await this.countDocuments({ status: { $in: ONLINE_STATUSES } });
  const offline = total - online;
  return { total, online, offline };
};

pointSchema.statics.findExpiredReservations = function () {
  return this.find({
    status: 'reserved',
    reservationendtime: { $lt: new Date() }
  });
};

pointSchema.statics.clearExpiredReservations = async function (PointStatusHistory) {
  const expired = await this.findExpiredReservations();
  let count = 0;
  for (const point of expired) {
    await point.updateStatus('available', PointStatusHistory);
    count++;
  }
  return count;
};

pointSchema.statics.findNearby = function (longitude, latitude, maxDistance = 5000) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    }
  });
};

pointSchema.statics.isValidStatus = function (status) {
  return VALID_STATUSES.includes(status);
};

pointSchema.statics.getValidStatuses = function () {
  return [...VALID_STATUSES];
};

pointSchema.statics.formatTimestamp = formatTimestamp;

const Point = mongoose.model('Point', pointSchema);

module.exports = Point;
module.exports.VALID_STATUSES = VALID_STATUSES;
module.exports.ONLINE_STATUSES = ONLINE_STATUSES;
module.exports.formatTimestamp = formatTimestamp;

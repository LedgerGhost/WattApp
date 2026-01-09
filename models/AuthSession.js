const mongoose = require('mongoose');
const crypto = require('crypto');

const authSessionSchema = new mongoose.Schema(
    {
      token_id: {
        type: String,
        required: true,
        unique: true,
        index: true
      },
      user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
      },
      // Matches "device_info" as a nested object with 4 fields
      device_info: {
        user_agent: {
          type: String,
          trim: true,
          maxlength: 500
        },
        ip_address: {
          type: String,
          trim: true
        },
        device_type: {
          type: String,
          default: 'unknown' // or 'web', 'mobile_ios', etc.
        },
        device_name: {
          type: String,
          default: 'Unknown Device'
        }
      },
      // ----------------------------------------
      
      // Matches "created_at"
      created_at: {
        type: Date,
        default: Date.now
      },
      // Matches "expires_at"
      expires_at: {
        type: Date,
        required: true,
        index: true
      },
      // Matches "last_used_at"
      last_used_at: {
        type: Date,
        default: Date.now
      },
      // Matches "is_valid"
      is_valid: {
        type: Boolean,
        default: true
      }
    },
    {
      collection: 'auth_sessions',
      // This ensures that when you convert to JSON, the virtuals/getters are used if needed
      toJSON: { virtuals: true },
      toObject: { virtuals: true }
    }
);

// --- Indexes (Updated to use snake_case names) ---
authSessionSchema.index({ token_id: 1 }, { unique: true });
authSessionSchema.index({ user_id: 1, is_valid: 1 });
authSessionSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

// --- Instance methods (Updated logic for new field names) ---
authSessionSchema.methods.isValid = function () {
  return this.is_valid && new Date() < this.expires_at;
};

authSessionSchema.methods.invalidate = async function () {
  this.is_valid = false;
  return this.save();
};

authSessionSchema.methods.touch = async function () {
  this.last_used_at = new Date();
  return this.save();
};

authSessionSchema.methods.extend = async function (hours = 24) {
  this.expires_at = new Date(Date.now() + hours * 60 * 60 * 1000);
  this.last_used_at = new Date();
  return this.save();
};

// --- Static methods (Updated logic for new field names) ---
authSessionSchema.statics.generateToken = function () {
  return crypto.randomBytes(32).toString('hex');
};

authSessionSchema.statics.createSession = async function (userId, options = {}) {
  const {
    expiresInHours = 24,
    // Expecting these to be passed in options
    userAgent = 'Unknown',
    ipAddress = null,
    deviceType = 'unknown',
    deviceName = 'Unknown Device'
  } = options;

  const token = this.generateToken();
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  return this.create({
    token_id: token,
    user_id: userId,
    expires_at: expiresAt,
    // Nesting the data into the device_info object
    device_info: {
      user_agent: userAgent,
      ip_address: ipAddress,
      device_type: deviceType,
      device_name: deviceName
    },
    is_valid: true
  });
};

authSessionSchema.statics.validateToken = async function (token) {
  if (!token) return null;
  
  // Search using snake_case fields
  const session = await this.findOne({
    token_id: token,
    is_valid: true,
    expires_at: { $gt: new Date() }
  }).populate('user_id');

  if (session) {
    await session.touch();
  }

  return session;
};

authSessionSchema.statics.invalidateToken = async function (token) {
  const session = await this.findOne({ token_id: token });
  if (!session) return false;
  await session.invalidate();
  return true;
};

authSessionSchema.statics.invalidateAllForUser = async function (userId) {
  const result = await this.updateMany(
      { user_id: userId, is_valid: true },
      { is_valid: false }
  );
  return result.modifiedCount;
};

authSessionSchema.statics.getActiveSessions = function (userId) {
  return this.find({
    user_id: userId,
    is_valid: true,
    expires_at: { $gt: new Date() }
  }).sort({ last_used_at: -1 });
};

authSessionSchema.statics.getUserFromToken = async function (token) {
  const session = await this.validateToken(token);
  if (!session || !session.user_id) {
    return null;
  }
  return session.user_id;
};

authSessionSchema.statics.cleanup = async function () {
  const result = await this.deleteMany({
    $or: [{ expires_at: { $lt: new Date() } }, { is_valid: false }]
  });
  return result.deletedCount;
};

const AuthSession = mongoose.model('AuthSession', authSessionSchema);

module.exports = AuthSession;
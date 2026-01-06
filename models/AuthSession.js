const mongoose = require('mongoose');
const crypto = require('crypto');

const authSessionSchema = new mongoose.Schema(
    {
      token: {
        type: String,
        required: true,
        unique: true,
        index: true
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
      },
      expiresAt: {
        type: Date,
        required: true,
        index: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      },
      lastActivityAt: {
        type: Date,
        default: Date.now
      },
      userAgent: {
        type: String,
        trim: true,
        maxlength: 500
      },
      ipAddress: {
        type: String,
        trim: true
      },
      isActive: {
        type: Boolean,
        default: true
      }
    },
    {
      collection: 'auth_sessions'
    }
);

// Indexes
authSessionSchema.index({ token: 1 }, { unique: true });
authSessionSchema.index({ userId: 1, isActive: 1 });
authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Instance methods
authSessionSchema.methods.isValid = function () {
  return this.isActive && new Date() < this.expiresAt;
};

authSessionSchema.methods.invalidate = async function () {
  this.isActive = false;
  return this.save();
};

authSessionSchema.methods.touch = async function () {
  this.lastActivityAt = new Date();
  return this.save();
};

authSessionSchema.methods.extend = async function (hours = 24) {
  this.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  this.lastActivityAt = new Date();
  return this.save();
};

// Static methods
authSessionSchema.statics.generateToken = function () {
  return crypto.randomBytes(32).toString('hex');
};

authSessionSchema.statics.createSession = async function (userId, options = {}) {
  const {
    expiresInHours = 24,
    userAgent = null,
    ipAddress = null
  } = options;

  const token = this.generateToken();
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  return this.create({
    token,
    userId,
    expiresAt,
    userAgent,
    ipAddress,
    isActive: true
  });
};

authSessionSchema.statics.validateToken = async function (token) {
  if (!token) return null;
  const session = await this.findOne({
    token,
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).populate('userId');

  if (session) {
    await session.touch();
  }

  return session;
};

authSessionSchema.statics.invalidateToken = async function (token) {
  const session = await this.findOne({ token });
  if (!session) return false;
  await session.invalidate();
  return true;
};

authSessionSchema.statics.invalidateAllForUser = async function (userId) {
  const result = await this.updateMany(
      { userId, isActive: true },
      { isActive: false }
  );
  return result.modifiedCount;
};

authSessionSchema.statics.getActiveSessions = function (userId) {
  return this.find({
    userId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).sort({ lastActivityAt: -1 });
};

authSessionSchema.statics.getUserFromToken = async function (token) {
  const session = await this.validateToken(token);
  if (!session || !session.userId) {
    return null;
  }
  return session.userId;
};

authSessionSchema.statics.cleanup = async function () {
  const result = await this.deleteMany({
    $or: [{ expiresAt: { $lt: new Date() } }, { isActive: false }]
  });
  return result.deletedCount;
};

authSessionSchema.statics.hasActiveSession = async function (userId) {
  const count = await this.countDocuments({
    userId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  });
  return count > 0;
};

authSessionSchema.statics.getSessionCount = function (userId) {
  return this.countDocuments({
    userId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  });
};

const AuthSession = mongoose.model('AuthSession', authSessionSchema);

module.exports = AuthSession;

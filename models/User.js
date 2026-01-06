/**
 * User Model
 *
 * Handles user authentication for WattApp EV Charging API
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
    {
      username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        lowercase: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [50, 'Username cannot exceed 50 characters']
      },
      password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters']
      },
      role: {
        type: String,
        enum: {
          values: ['user', 'admin', 'operator'],
          message: 'Role must be user, admin, or operator'
        },
        default: 'user'
      },
      isActive: {
        type: Boolean,
        default: true
      },
      lastLogin: {
        type: Date
      },
      activeReservation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reservation',
        default: null
      }
    },
    {
      timestamps: true,
      collection: 'users'
    }
);

// Indexes
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Password hashing
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const saltRounds = 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance methods
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isAdmin = function () {
  return this.role === 'admin';
};

userSchema.methods.isOperator = function () {
  return this.role === 'operator' || this.role === 'admin';
};

userSchema.methods.updateLastLogin = async function () {
  this.lastLogin = new Date();
  await this.save();
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

// Static methods
userSchema.statics.findByUsername = function (username) {
  return this.findOne({
    username: username.toLowerCase().trim(),
    isActive: true
  });
};

userSchema.statics.authenticate = async function (username, password) {
  const user = await this.findByUsername(username);
  if (!user) return null;
  const isMatch = await user.comparePassword(password);
  if (!isMatch) return null;
  await user.updateLastLogin();
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;

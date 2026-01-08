const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    // --- IDENTITY ---
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, 'Please use a valid email address']
    },

    // --- SECURITY ---
    password_hash: {
      type: String,
      required: true
    },

    // --- PERSONAL INFO ---
    first_name: {
      type: String,
      trim: true,
      required: [true, 'First name is required'],
      minlength: [2, 'First name must be at least 2 characters'],
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    last_name: {
      type: String,
      trim: true,
      required: [true, 'Last name is required'],
      minlength: [2, 'Last name must be at least 2 characters'],
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    phone: {
      type: String,
      trim: true
    },

    // --- ROLES & STATUS ---
    role: {
      type: String,
      enum: {
        values: ['user', 'admin', 'operator', 'customer'],
        message: 'Role must be user, admin, operator, or customer'
      },
      default: 'customer'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active'
    },

    // --- COMPLEX OBJECTS (From your DB dump) ---
    // Using 'Mixed' allows these to store any JSON structure without crashing
    payment_methods: {
      type: [mongoose.Schema.Types.Mixed], 
      default: []
    },
     preferences: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    vehicle_info: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },

    // --- LOGIC FIELDS ---
    activeReservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      default: null
    },

    // --- SECURITY FLAGS & LOGS ---
    email_verified: { 
      type: Boolean, 
      default: false 
    },
    two_factor_enabled: { 
      type: Boolean, 
      default: false 
    },
    failed_login_attempts: { 
      type: Number, 
      default: 0 
    },
    last_login: {
      type: Date
    },
  },
  {
    collection: 'users',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

// --- INDEXES ---
userSchema.index({ role: 1 });

// --- INSTANCE METHODS ---

// Compare Password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password_hash);
};

// Role Checks 
userSchema.methods.isAdmin = function () {
  return this.role === 'admin';
};

userSchema.methods.isOperator = function () {
  // Checks if user is operator OR admin (standard hierarchy)
  return this.role === 'operator' || this.role === 'admin';
};

// Update Login (Updated to use last_login)
userSchema.methods.updateLastLogin = async function () {
  this.last_login = new Date();
  await this.save();
};

// Clean JSON Output 
// This ensures 'password_hash' is NEVER sent to the frontend
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password_hash; // Hide the hash
  delete obj.__v;
  return obj;
};

// --- STATIC METHODS ---

// Find By Email 
userSchema.statics.findByEmail = function (email) {
  return this.findOne({
    email: email.toLowerCase().trim(),
    status: 'active' // Checks 'status' instead of 'isActive'
  });
};

//  Authenticate 
userSchema.statics.authenticate = async function (email, password) {
  const user = await this.findByEmail(email);
  if (!user) return null;
  
  const isMatch = await user.comparePassword(password);
  if (!isMatch) return null;
  
  await user.updateLastLogin();
  return user;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
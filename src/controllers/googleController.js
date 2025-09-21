const passport = require('passport');
const { User } = require('../models');
const { generateToken } = require('../middlewares/auth');

// Google OAuth Strategy Configuration
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('🔍 Google profile:', {
      id: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.name,
      photos: profile.photos?.[0]?.value
    });
    
    // Check if user already exists
    let user = await User.findOne({ email: profile.emails[0].value });
    
    if (user) {
      // User exists, update Google ID if not set
      if (!user.googleId) {
        user.googleId = profile.id;
        await user.save();
      }
      return done(null, user);
    } else {
      // Create new user with required fields
      const firstName = profile.name.givenName || 'User';
      const lastName = profile.name.familyName || 'Google';
      const fullName = `${firstName} ${lastName}`.trim();
      
      user = await User.create({
        googleId: profile.id,
        email: profile.emails[0].value,
        fullName: fullName,
        role: 'patient', // Default role for Google login
        phone: '000-000-0000', // Default phone for Google users
        isActive: true,
        avatar: profile.photos[0]?.value
      });
      
      console.log('✅ Google user created:', {
        id: user._id,
        email: user.email,
        fullName: user.fullName
      });
      
      return done(null, user);
    }
  } catch (error) {
    console.error('Google OAuth error:', error);
    return done(error, null);
  }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth routes
const googleAuth = (req, res) => {
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res);
};

const googleCallback = (req, res) => {
  passport.authenticate('google', async (err, user) => {
    if (err) {
      console.error('Google auth error:', err);
      return res.redirect(`${process.env.CLIENT_URL}/auth-success?error=google_auth_failed`);
    }
    
    if (!user) {
      console.error('No user returned from Google');
      return res.redirect(`${process.env.CLIENT_URL}/auth-success?error=google_auth_failed`);
    }

    try {
      // Generate JWT token
      const token = generateToken(user._id);
      
      // Redirect to frontend with token
      res.redirect(`${process.env.CLIENT_URL}/auth-success?token=${token}&user=${encodeURIComponent(JSON.stringify({
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        avatar: user.avatar
      }))}`);
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect(`${process.env.CLIENT_URL}/auth-success?error=token_generation_failed`);
    }
  })(req, res);
};

module.exports = {
  googleAuth,
  googleCallback
};

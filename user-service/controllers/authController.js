const userModel = require('../models/userModel');
const { hashPassword, comparePassword } = require('../utils/hash-password');
const { createAccessToken, createRefreshToken, verifyRefreshToken } = require('../utils/tokens');
const { v4: uuidv4 } = require('uuid');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');

// Helper function to get Google Client
const getGoogleClient = () => {
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ;
  const clientID = process.env.GOOGLE_CLIENT_ID ;
  const redirectUrl = process.env.GOOGLE_REDIRECT_URI;

  if (!clientSecret || !clientID) {
    throw new Error("Google Client Secret or ID is missing");
  }

  return new OAuth2Client(clientID, clientSecret, redirectUrl);
};

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'Email is already taken.' });
    }

    const hashedPassword = await hashPassword(password);
    const newUser = await userModel.create(name, email, hashedPassword);

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: newUser.id, name: newUser.name, email: newUser.email }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.findByEmail(email);

    if (!user) return res.status(404).json({ message: 'User not found.' });
    
    const isPasswordCorrect = await comparePassword(password, user.password);
    if (!isPasswordCorrect) return res.status(401).json({ message: 'Incorrect Password.' });

    // 2FA Check
    if (user.two_factor_enabled) {
      return res.status(200).json({
        message: '2FA required',
        data: { twoFactorRequired: true, tempUserId: user.id }
      });
    }

    // Session Management
    const jti = uuidv4();
    let sessions = user.refresh_sessions || [];
    if (sessions.length >= 5) sessions.shift();
    sessions.push({ jti, userAgent: req.headers['user-agent'] });

    await userModel.updateUser(user.id, { refresh_sessions: JSON.stringify(sessions) });

    const accessToken = createAccessToken(user.id, user.role, user.token_version);
    const refreshToken = createRefreshToken(user.id, user.token_version, jti);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

    res.status(200).json({
      message: 'Login successful',
      data: { accessToken, id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const setup2FA = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const secret = speakeasy.generateSecret({
      length: 20,
      name: `G10App(${user.email})`,
      issuer: 'G10 Project',
    });

    await userModel.updateUser(user.id, { two_factor_secret: secret.base32 });
    
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    
    res.status(200).json({
      message: 'Scan QR code with authenticator app',
      data: { qrCode: qrCodeUrl }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const verify2FASetup = async (req, res) => {
  try {
    const { twoFactorCode } = req.body;
    const user = await userModel.findById(req.user.id);

    const isValid = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: twoFactorCode,
      window: 1,
    });

    if (!isValid) return res.status(401).json({ message: 'Invalid OTP' });

    await userModel.updateUser(user.id, { two_factor_enabled: true });

    res.status(200).json({ message: 'Two-factor authentication enabled' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const verify2FALogin = async (req, res) => {
  try {
    const { userId, twoFactorCode } = req.body;
    const user = await userModel.findById(userId);

    if (!user || !user.two_factor_enabled) {
      return res.status(400).json({ message: 'Invalid request' });
    }

    const isValid = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: twoFactorCode,
      window: 1,
    });

    if (!isValid) return res.status(401).json({ message: 'Invalid Code' });

    // Same login sequence as main login handler
    const jti = uuidv4();
    let sessions = user.refresh_sessions || [];
    if (sessions.length >= 5) sessions.shift();
    sessions.push({ jti, userAgent: req.headers['user-agent'] });

    await userModel.updateUser(user.id, { refresh_sessions: JSON.stringify(sessions) });

    const accessToken = createAccessToken(user.id, user.role, user.token_version);
    const refreshToken = createRefreshToken(user.id, user.token_version, jti);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === 'production', path: '/',
    });

    res.status(200).json({
      message: 'Login successful',
      data: { accessToken, id: user.id, name: user.name }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


const googleAuthRedirect = async (req, res) => {
  try {
    const client = getGoogleClient();
    const url = client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["openid", "email", "profile"],
    });

    res.redirect(url);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const googleAuthCallback = async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) {
      throw new Error("Google authentication failed: Code missing");
    }

    const client = getGoogleClient();
    const { tokens } = await client.getToken(code);

    if (!tokens?.id_token) {
      throw new Error("Google authentication failed: ID Token missing");
    }
    client.setCredentials(tokens);

    // Verify token and read user information
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) {
      throw new Error("Google authentication failed: Email not verified");
    }

    const normalisedEmail = payload.email.toLowerCase().trim();
    let user = await userModel.findByEmail(normalisedEmail);

    // If user doesn't exist, register them
    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString("hex");
      const passwordHash = await hashPassword(randomPassword);
      
      // In g10, your model uses `name` instead of `username`
      const name = payload.name || 'Google User';

      user = await userModel.create(name, normalisedEmail, passwordHash);
      // Immediately verify their email since it came from Google
      user = await userModel.updateUser(user.id, { is_email_verified: true });
    } else if (!user.is_email_verified) {
      user = await userModel.updateUser(user.id, { is_email_verified: true });
    }

    // Session Management (same as standard login)
    let sessions = user.refresh_sessions || [];
    if (sessions.length >= 5) sessions.shift();
    
    const jti = uuidv4();
    sessions.push({ jti, userAgent: req.headers["user-agent"] || "Google OAuth" });
    await userModel.updateUser(user.id, { refresh_sessions: JSON.stringify(sessions) });

    // Create Tokens
    const accessToken = createAccessToken(user.id, user.role, user.token_version);
    const refreshToken = createRefreshToken(user.id, user.token_version, jti);

    const isProd = process.env.NODE_ENV === "production";
    
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      secure: isProd,
      path: "/",
    });

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
    });

    // Redirect back to frontend on success
    res.redirect(`${process.env.FRONTEND_URL}/oauth-success`);
  } catch (error) {
    console.error("OAuth Error:", error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
  }
};

module.exports = { register, login, setup2FA, verify2FASetup, verify2FALogin ,googleAuthCallback,googleAuthRedirect};
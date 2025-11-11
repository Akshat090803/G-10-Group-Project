const Hotel = require('../models/hotelModel');
const Booking = require('../models/bookingModel');

const getHealth = (req, res) => res.status(200).send({ status: 'UP' });

const getAllHotels = async (req, res) => {
  try {
    const hotels = await Hotel.find();
    console.log('[Hotel Service] Fetched all hotels');
    res.json(hotels);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

const createHotel = async (req, res) => {
  try {
    const newHotel = new Hotel(req.body);
    await newHotel.save();
    console.log('[Hotel Service] Created new hotel');
    res.status(201).json(newHotel);
  } catch (err) {
    res.status(400).send(err.message);
  }
};

const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ timestamp: -1 });
    console.log('[Hotel Service] Fetched all bookings');
    res.json(bookings);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

module.exports = {
  getHealth,
  getAllHotels,
  createHotel,
  getAllBookings
};
const amqp = require('amqplib');
const Booking = require('../models/bookingModel');

const QUEUE_NAME = 'hotel_bookings';
const RABBITMQ_URL = 'amqp://guest:guest@localhost:5672';
const MAX_RETRIES = 3;

// --- Helper for exponential backoff ---

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- Main message processing logic ---
const processMessage = async (msg, attempt = 1) => {
  try {
    // --- CHAOS: Simulate a 30% chance of DB failure ---
    if (Math.random() < 0.3) {
      console.log('[Hotel DB] CHAOS! Simulated DB failure.');
      throw new Error('Simulated Database Connection Error');
    }

    const bookingDetails = JSON.parse(msg.content.toString());
    console.log(`[Hotel DB] Saving booking to local MongoDB...`);
    const booking = new Booking(bookingDetails);
    await booking.save();
    console.log(`[Hotel DB] Booking saved to local MongoDB.`);
    
    return true; // Success

  } catch (err) {
    console.error(`[Hotel MQ] Error processing message (Attempt ${attempt}):`, err.message);
    
    if (attempt >= MAX_RETRIES) {
      console.error(`[Hotel MQ] FINAL ATTEMPT FAILED. Rejecting message.`);
      return false; // Failed permanently
    }
    
    // It's a retry-able error
    const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
    console.log(`[Hotel MQ] Retrying save (Attempt ${attempt + 1}/${MAX_RETRIES}) in ${delay / 1000}s...`);
    await wait(delay);
    
    return processMessage(msg, attempt + 1); // Retry
  }
};

// --- RabbitMQ Consumer Setup ---
const startConsumer = async () => {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    
    channel.prefetch(1); // Only process one message at a time
    
    console.log(`[Hotel MQ] Waiting for messages in queue: ${QUEUE_NAME}`);

    channel.consume(QUEUE_NAME, async (msg) => {
      if (msg !== null) {
        console.log(`[Hotel MQ] Received booking from queue:`, JSON.parse(msg.content.toString()));
        
        const success = await processMessage(msg);
        
        if (success) {
          channel.ack(msg); // Acknowledge message (remove from queue)
        } else {
          channel.nack(msg, false, false); // Reject message (don't requeue)
          // In a real system, this would go to a "Dead Letter Queue"
        }
      }
    });

  } catch (err) {
    console.error('[Hotel MQ] Failed to connect to RabbitMQ (is it running?)', err);
    setTimeout(startConsumer, 5000); // Retry connection
  }
};

module.exports = { startConsumer };
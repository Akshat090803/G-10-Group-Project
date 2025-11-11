const amqp = require('amqplib');
const Booking = require('../models/bookingModel'); // Consumer needs the model

const QUEUE_NAME = 'hotel_bookings';
const RABBITMQ_URL = 'amqp://guest:guest@localhost:5672';

const startConsumer = async () => {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    channel.prefetch(1); 
    
    console.log(`[Hotel MQ] Waiting for messages in queue: ${QUEUE_NAME}`);

    channel.consume(QUEUE_NAME, async (msg) => {
      if (msg !== null) {
        try {
          const bookingDetails = JSON.parse(msg.content.toString());
          console.log(`[Hotel MQ] Received booking from queue:`, bookingDetails);
          
          // Save to local DB using the model
          const booking = new Booking(bookingDetails);
          await booking.save();
          console.log(`[Hotel DB] Booking saved to local MongoDB.`);

          channel.ack(msg);

        } catch (err) {
          console.error('[Hotel MQ] Error processing message:', err);
          channel.nack(msg);
        }
      }
    });

  } catch (err) {
    console.error('[Hotel MQ] Failed to connect to RabbitMQ (is it running?)', err);
    setTimeout(startConsumer, 5000);
  }
};

module.exports = { startConsumer };
const amqp = require('amqplib');

const QUEUE_NAME = 'hotel_bookings';
const RABBITMQ_URL = 'amqp://guest:guest@localhost:5672'; 

let channel = null;

const connectToQueue = async () => {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log(`[User MQ] Connected to RabbitMQ and queue '${QUEUE_NAME}' is ready.`);
  } catch (err) {
    console.error('[User MQ] Failed to connect to RabbitMQ (is it running?)', err);
    setTimeout(connectToQueue, 5000);
  }
};

connectToQueue();

const sendMessage = (msg) => {
  if (!channel) {
    console.error('[User MQ] Channel not available. Message not sent.');
    return;
  }
  
  const messageBuffer = Buffer.from(JSON.stringify(msg));
  channel.sendToQueue(QUEUE_NAME, messageBuffer, { persistent: true });
  console.log(`[User MQ] Sent message to queue: ${JSON.stringify(msg)}`);
};

module.exports = { sendMessage };
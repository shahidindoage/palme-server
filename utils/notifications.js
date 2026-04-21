const { Expo } = require('expo-server-sdk');

// Create a new Expo SDK client
let expo = new Expo();

const prisma = require('../config/db');

exports.sendPushNotification = async (pushToken, title, body, data = {}, userId = null) => {
  // Save notification to database if userId is provided
  if (userId) {
    try {
      await prisma.notification.create({
        data: {
          userId,
          title,
          body,
          data: data ? data : {}
        }
      });
    } catch (dbError) {
      console.error('Error saving notification to DB:', dbError);
    }
  }

  // Check if the push token is valid
  if (!pushToken || !Expo.isExpoPushToken(pushToken)) {
    console.error(`Push token ${pushToken} is not a valid Expo push token`);
    return;
  }

  // Create the message
  const message = {
    to: pushToken,
    sound: 'default',
    title,
    body,
    data,
  };

  try {
    const chunks = expo.chunkPushNotifications([message]);
    const tickets = [];
    
    for (let chunk of chunks) {
      try {
        let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error(error);
      }
    }
    return tickets;
  } catch (error) {
    console.error(error);
  }
};

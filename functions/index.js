// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

admin.initializeApp();

exports.notifyUserOnPreparing = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only send if status changed to "Preparing"
    if (before.status === after.status || after.status !== 'Preparing') {
      return null;
    }

    try {
      const userId = after.userId;

      // Get user document
      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      const userData = userDoc.data();

      if (!userData || !userData.fcmToken) {
        console.log('No user data or fcmToken');
        return null;
      }

      const expoPushToken = userData.fcmToken;

      // Send push notification using Expo
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: expoPushToken,
          title: 'Meal Status Update',
          body: 'Your meal is now being prepared!',
          sound: 'default',
        }),
      });

      const data = await response.json();
      console.log('Push response:', data);
    } catch (error) {
      console.error('Error sending push notification:', error);
    }

    return null;
  });

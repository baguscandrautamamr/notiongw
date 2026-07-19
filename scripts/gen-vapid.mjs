import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
console.log("VAPID keys generated. Add these to your environment:\n");
console.log("NEXT_PUBLIC_VAPID_PUBLIC_KEY=" + keys.publicKey);
console.log("VAPID_PRIVATE_KEY=" + keys.privateKey);

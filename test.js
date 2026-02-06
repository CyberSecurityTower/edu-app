// test-notification.js
const token = "ExponentPushToken[gKLEysFhvaLMYBTq0Kv3gZ]"; // 👈 ضع التوكن الخاص بك هنا

async function sendTest() {
  const message = {
    to: token,
    sound: 'default',
    title: "تجربة النظام الجديد 🚀",
    body: "اضغط هنا للذهاب إلى شاشة المهام",
    data: { 
      source: "tasks", // هذا ما سيفهمه التطبيق للتوجيه
      type: "task_reminder",
      taskId: "123" 
    },
  };

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([message]),
  });

  const result = await response.json();
  console.log(result);
}

sendTest();
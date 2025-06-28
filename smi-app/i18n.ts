import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';

// English and Marathi translations
const en = {
  hello: 'Hello',
  welcome: 'Welcome to Swabhav360!',
  morning: 'Morning',
  workout: 'Workout',
  afternoon: 'Afternoon',
  evening: 'Evening',
  daily: 'Daily activity',
  points: 'Points',
  done: 'Done',
  skip: 'Skip',
  close: 'Close',
  tasks: 'Tasks',
  select_language: 'Select Language',
  english: 'English',
  marathi: 'Marathi',
  task_morning_1: "Slept 8 hours (slept before 9:30 PM last night?)",
  task_morning_2: "Brushed your teeth?",
  task_morning_3: "Went to poop?",
  task_morning_4: "Boiled water and drank?",
  task_morning_5: "Packed session items in advance?",
  task_morning_6: "Thanked God your Creator?",
  task_workout_1: "25 Pushups",
  task_workout_2: "25 Pullups",
  task_workout_3: "25 Glute Bridges",
  task_workout_4: "25 Squats",
  task_workout_5: "Juggling – enter number done today",
  task_workout_6: "Practiced only with team members",
  task_afternoon_1: "Helped someone? – explain the situation",
  task_afternoon_2: "Forgave someone? – explain the situation",
  task_afternoon_3: "Went to school today?",
  task_evening_1: "Washed jersey kit after the game?",
  task_evening_2: "Daily update (before 9 PM)",
  task_evening_3: "What good happened today?",
  task_evening_4a: "What bad happened today?",
  task_evening_4b: "Highest moment of the day?",
  task_evening_4c: "Lowest moment of the day?",
  task_evening_4d: "Dinner before 8 PM?",
  task_daily_1: "Drank minimum 2 litres of water?",
  task_daily_2: "Went to turf today?",
  task_daily_3: "Listened to parents and helped them?",
  task_daily_4: "Respect and value girls? in neighbourhood, school, and public?",
  task_daily_5: "No outside food?",
  task_daily_6: 'No bf/gf? say "My focus is career now, so I will not talk"',
  task_daily_7: "No addictions? – porn, cigarette, tobacco, etc.",
  task_daily_8: 'No talking to area friends? say "My focus is career now, so I will not talk"',
};

const mr = {
  hello: 'नमस्कार',
  welcome: 'स्वाभाव360 मध्ये आपले स्वागत आहे!',
  morning: 'सकाळ',
  workout: 'व्यायाम',
  afternoon: 'दुपार',
  evening: 'संध्याकाळ',
  daily: 'दैनंदिन क्रियाकलाप',
  points: 'गुण',
  done: 'पूर्ण',
  skip: 'वगळा',
  close: 'बंद',
  tasks: 'कार्ये',
  select_language: 'भाषा निवडा',
  english: 'इंग्रजी',
  marathi: 'मराठी',
  task_morning_1: "८ तास झोपलात का (काल रात्री ९:३० पूर्वी झोपलात का?)",
  task_morning_2: "तुम्ही दात घासले का?",
  task_morning_3: "शौचास गेला का?",
  task_morning_4: "पाणी उकळून प्यायलात का?",
  task_morning_5: "सेशनसाठी वस्तू आधीच पॅक केल्या का?",
  task_morning_6: "सृष्टीकर्त्याचे आभार मानले का?",
  task_workout_1: "२५ पुशअप्स",
  task_workout_2: "२५ पुलअप्स",
  task_workout_3: "२५ ग्लूट ब्रिजेस",
  task_workout_4: "२५ स्क्वॅट्स",
  task_workout_5: "जगलिंग – आज किती केले ते लिहा",
  task_workout_6: "फक्त टीम मेंबर्ससोबत सराव केला का?",
  task_afternoon_1: "कोणाला मदत केली का? – परिस्थिती स्पष्ट करा",
  task_afternoon_2: "कोणाला माफ केले का? – परिस्थिती स्पष्ट करा",
  task_afternoon_3: "आज शाळेत गेला का?",
  task_evening_1: "खेळानंतर जर्सी धुतली का?",
  task_evening_2: "दैनंदिन अपडेट (रात्री ९ पूर्वी)",
  task_evening_3: "आज काय चांगले घडले?",
  task_evening_4a: "आज काय वाईट घडले?",
  task_evening_4b: "आजचा सर्वोच्च क्षण कोणता?",
  task_evening_4c: "आजचा सर्वात खालचा क्षण कोणता?",
  task_evening_4d: "रात्री ८ पूर्वी जेवण झाले का?",
  task_daily_1: "किमान २ लिटर पाणी प्यायलात का?",
  task_daily_2: "आज टर्फवर गेला का?",
  task_daily_3: "पालकांचे ऐकले आणि त्यांना मदत केली का?",
  task_daily_4: "शेजारी, शाळा आणि सार्वजनिक ठिकाणी मुलींचा आदर केला का?",
  task_daily_5: "बाहेरचे अन्न टाळले का?",
  task_daily_6: 'कोणताही bf/gf नाही? "माझा फोकस करिअरवर आहे, त्यामुळे मी बोलणार नाही" असे म्हटले का?',
  task_daily_7: "कोणतेही व्यसन नाही? – पॉर्न, सिगारेट, तंबाखू, इ.",
  task_daily_8: 'एरिया मित्रांशी बोललो नाही? "माझा फोकस करिअरवर आहे, त्यामुळे मी बोलणार नाही" असे म्हटले का?',
};

// Create i18n instance
const i18n = new I18n({
  en,
  mr,
});

i18n.enableFallback = true;
const deviceLocale = Localization.locale || 'en';
i18n.locale = deviceLocale.startsWith('mr') ? 'mr' : 'en';

export function setLanguage(lang: 'en' | 'mr') {
  i18n.locale = lang;
}

export default i18n; 
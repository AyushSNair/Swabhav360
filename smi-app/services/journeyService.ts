import { FIRESTORE_DB } from '../FirebaseConfig';
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  updateDoc, 
  collection, 
  serverTimestamp,
  onSnapshot,
  writeBatch,
  DocumentData,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  query,
  where
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

type QuestPeriod = "morning" | "workout" | "afternoon" | "evening" | "daily";

export interface SessionData {
  submitted: boolean;
  score: number;
  timestamp: any;
  questState?: {
    [taskId: string]: {
      checked?: boolean;
      count?: number;
      value?: string;
    };
  };
}

interface DailyJourneyData {
  id?: string;
  date: string;
  lastUpdated: any;
  totalPoints: number;
  percentComplete: number;
}

// Helper to get the current date in YYYY-MM-DD format
const getCurrentDate = () => new Date().toISOString().split('T')[0];

// Get the current user ID
const getUserId = () => {
  const auth = getAuth();
  return auth.currentUser?.uid;
};

// Get the document reference for a user's daily journey
const getDailyJourneyRef = (userId: string, date: string = getCurrentDate()) => {
  return doc(FIRESTORE_DB, 'users', userId, 'dailyJourneys', date);
};

// Get the document reference for a session
const getSessionRef = (userId: string, period: QuestPeriod, date: string = getCurrentDate()) => {
  return doc(collection(getDailyJourneyRef(userId, date), 'sessions'), period);
};

// Save or update a session
export const saveSession = async (period: QuestPeriod, data: SessionData) => {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');

  const date = getCurrentDate();
  const sessionRef = getSessionRef(userId, period, date);
  const dailyJourneyRef = getDailyJourneyRef(userId, date);

  const sessionData = {
    ...data,
    timestamp: serverTimestamp()
  };

  const batch = writeBatch(FIRESTORE_DB);
  
  // Update session data
  batch.set(sessionRef, sessionData, { merge: true });
  
  // Update daily journey summary
  batch.set(dailyJourneyRef, {
    date,
    lastUpdated: serverTimestamp(),
    totalPoints: 0, // Will be updated after all sessions are processed
    percentComplete: 0 // Will be updated after all sessions are processed
  }, { merge: true });

  await batch.commit();
  
  return { ...sessionData, id: period };
};

// Load all sessions for the current day
export const loadSessions = async (date: string = getCurrentDate()) => {
  const userId = getUserId();
  if (!userId) {
    console.log('No user ID found');
    return null;
  }

  try {
    const dailyJourneyRef = getDailyJourneyRef(userId, date);
    const docSnap = await getDoc(dailyJourneyRef);

    if (!docSnap.exists()) {
      console.log('No daily journey document found');
      return null;
    }

    const sessions: Record<string, SessionData> = {};
    const sessionsSnap = await getDocs(collection(dailyJourneyRef, 'sessions'));
    
    // Log the number of sessions found
    console.log(`Found ${sessionsSnap.size} sessions for date ${date}`);
    
    sessionsSnap.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      const sessionData = doc.data();
      console.log(`Session ${doc.id}:`, sessionData);
      sessions[doc.id] = {
        submitted: sessionData.submitted || false,
        score: sessionData.score || 0,
        timestamp: sessionData.timestamp,
        questState: sessionData.questState || {}
      };
    });

    const dailyData = {
      id: docSnap.id,
      ...docSnap.data(),
      sessions
    };

    console.log('Returning daily data:', dailyData);
    return dailyData as DailyJourneyData & { sessions: Record<string, SessionData> };
  } catch (error) {
    console.error('Error loading sessions:', error);
    return null;
  }
};

// Subscribe to real-time updates for a day's journey
export const subscribeToJourneyUpdates = (
  date: string,
  callback: (data: (DailyJourneyData & { sessions: Record<string, SessionData> }) | null) => void
) => {
  const userId = getUserId();
  if (!userId) return () => {};

  const dailyJourneyRef = getDailyJourneyRef(userId, date);
  
  return onSnapshot(dailyJourneyRef, async (doc: DocumentSnapshot<DocumentData>) => {
    if (!doc.exists()) {
      callback(null);
      return;
    }

    const sessionsSnap = await getDocs(collection(dailyJourneyRef, 'sessions'));
    const sessions: Record<string, SessionData> = {};
    
    sessionsSnap.forEach((sessionDoc: QueryDocumentSnapshot<DocumentData>) => {
      sessions[sessionDoc.id] = sessionDoc.data() as SessionData;
    });

    callback({
      ...(doc.data() as DailyJourneyData),
      id: doc.id,
      sessions
    });
  });
};

// Calculate and update daily totals
export const updateDailyTotals = async (date: string = getCurrentDate()) => {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');

  const dailyJourneyRef = getDailyJourneyRef(userId, date);
  const sessionsSnap = await getDocs(collection(dailyJourneyRef, 'sessions'));
  
  let totalPoints = 0;
  sessionsSnap.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
    const data = doc.data() as SessionData;
    if (data.submitted) {
      totalPoints += data.score || 0;
    }
  });

  // Assuming 5 sessions total (morning, workout, afternoon, evening, daily)
  const percentComplete = (sessionsSnap.size / 5) * 100;

  await updateDoc(dailyJourneyRef, {
    totalPoints,
    percentComplete,
    lastUpdated: serverTimestamp()
  });

  return { totalPoints, percentComplete };
};

// Get leaderboard data
export const getLeaderboard = async (timeRange: 'weekly' | 'monthly' | 'all-time') => {
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');

    const usersRef = collection(FIRESTORE_DB, 'users');
    const usersSnap = await getDocs(usersRef);
    
    const leaderboard: Array<{
      id: string;
      name: string;
      score: number;
      avatar?: string;
    }> = [];

    // Calculate date ranges
    const now = new Date();
    let startDate: Date | null = null;
    
    if (timeRange === 'weekly') {
      startDate = new Date(now.setDate(now.getDate() - 7));
    } else if (timeRange === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } // For 'all-time', startDate remains null

    // Process each user
    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      let totalScore = 0;

      // Query the user's daily journeys
      const journeysQuery = startDate
        ? query(
            collection(userDoc.ref, 'dailyJourneys'),
            where('date', '>=', startDate.toISOString().split('T')[0])
          )
        : collection(userDoc.ref, 'dailyJourneys');

      const journeysSnap = await getDocs(journeysQuery);
      
      // Sum up scores
      for (const journeyDoc of journeysSnap.docs) {
        const journeyData = journeyDoc.data();
        totalScore += journeyData.totalPoints || 0;
      }

      if (totalScore > 0) {
        // Try to get the name from profile first, then fall back to displayName, then email, then 'Anonymous'
        const userName = userData.name || 
                        userData.displayName || 
                        userData.email?.split('@')[0] || 
                        'Anonymous';
                        
        leaderboard.push({
          id: userDoc.id,
          name: userName,
          score: totalScore,
          avatar: userData.photoURL || userData.avatar
        });
      }
    }


    // Sort by score in descending order
    leaderboard.sort((a, b) => b.score - a.score);
    
    // Add ranks and default avatars
    return leaderboard.map((user, index) => ({
      ...user,
      rank: index + 1,
      avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`
    }));
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    throw error;
  }
};

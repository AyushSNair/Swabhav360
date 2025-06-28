"use client"

import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react"
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Dimensions,
  Modal,
  Image,
  FlatList,
  ImageBackground,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useQuest } from "../QuestContext"
import { saveSession, loadSessions, subscribeToJourneyUpdates, updateDailyTotals } from "../../services/journeyService"
import { getAuth } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { FIRESTORE_DB } from '../../FirebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import i18n, { setLanguage } from '../../i18n';

type Task = {
  id: string
  text: string
  points: number
  items?: string[]
  isCounter?: boolean
  isInput?: boolean
  hasAdd?: boolean
  hasMedia?: boolean
  max?: number
  isChecklistCount?: boolean
}

type QuestPeriod = "morning" | "workout" | "afternoon" | "evening" | "daily"

type Quests = {
  [key in QuestPeriod]: Task[]
}

type TaskState = {
  checked?: boolean;
  skipped?: boolean;
  count?: number;
  value?: string;
  completedTimestamp?: string;
  skippedTimestamp?: string;
};

type QuestState = {
  [key in QuestPeriod]: {
    [taskId: string]: TaskState;
    }
};

const initialQuests: Quests = {
  morning: [
    { id: "1", text: "task_morning_1", points: 3 },
    { id: "2", text: "task_morning_2", points: 3 },
    { id: "3", text: "task_morning_3", points: 3 },
    { id: "4", text: "task_morning_4", points: 3 },
    {
      id: "5",
      text: "task_morning_5",
      points: 3,
      items: ["Shoes", "Socks", "Shinpad", "Bag", "Bottles", "Notebook"],
      isChecklistCount: true,
    },
    { id: "6", text: "task_morning_6", points: 3 },
  ],
  workout: [
    { id: "1", text: "task_workout_1", points: 3, isCounter: true },
    { id: "2", text: "task_workout_2", points: 3, isCounter: true },
    { id: "3", text: "task_workout_3", points: 3, isCounter: true },
    { id: "4", text: "task_workout_4", points: 3, isCounter: true },
    { id: "5", text: "task_workout_5", points: 5, isInput: true, max: 999 },
    { id: "6", text: "task_workout_6", points: 3 },
  ],
  afternoon: [
    { id: "1", text: "task_afternoon_1", points: 5, isInput: true, max: 200 },
    { id: "2", text: "task_afternoon_2", points: 5, isInput: true, max: 200 },
    { id: "3", text: "task_afternoon_3", points: 3 },
  ],
  evening: [
    { id: "1", text: "task_evening_1", points: 3 },
    { id: "2", text: "task_evening_2", points: 5, isInput: true, max: 500 },
    { id: "3", text: "task_evening_3", points: 3, isInput: true, max: 500 },
    { id: "4a", text: "task_evening_4a", points: 3, isInput: true, max: 500 },
    { id: "4b", text: "task_evening_4b", points: 3, isInput: true, max: 500 },
    { id: "4c", text: "task_evening_4c", points: 3, isInput: true, max: 500 },
    { id: "4d", text: "task_evening_4d", points: 3 },
  ],
  daily: [
    { id: "1", text: "task_daily_1", points: 3 },
    { id: "2", text: "task_daily_2", points: 3 },
    { id: "3", text: "task_daily_3", points: 3 },
    { id: "4", text: "task_daily_4", points: 3 },
    { id: "5", text: "task_daily_5", points: 5 },
    { id: "6", text: "task_daily_6", points: 3 },
    { id: "7", text: "task_daily_7", points: 3 },
    { id: "8", text: "task_daily_8", points: 3 },
  ],
}

function getInitialQuestState(quests: Quests): QuestState {
  const initialState = {} as QuestState
  ;(Object.keys(quests) as QuestPeriod[]).forEach((period) => {
    initialState[period] = {}
    quests[period].forEach((task) => {
      if (task.isCounter) {
        initialState[period][task.id] = { count: 0 }
      } else if (task.isInput) {
        initialState[period][task.id] = { value: "" }
      } else {
        initialState[period][task.id] = { checked: false }
      }
    })
  })
  return initialState
}

interface SessionData {
  submitted: boolean;
  score: number;
  timestamp: string;
}

// Visually appealing color palette for cards
const CARD_COLORS = [
  ['#f472b6', '#f9a8d4'], // Pink
  ['#60a5fa', '#a5b4fc'], // Blue
  ['#fbbf24', '#fde68a'], // Yellow
  ['#34d399', '#6ee7b7'], // Green
  ['#f87171', '#fca5a5'], // Red
  ['#a78bfa', '#c4b5fd'], // Purple
];

// Helper to get color for a task index
function getCardColors(idx: number) {
  return CARD_COLORS[idx % CARD_COLORS.length];
}

// Update ConfettiBurst for simple falling animation
function ConfettiBurst({ visible, animate }: { visible: boolean; animate?: boolean }) {
  const NUM_CONFETTI = 32;
  const confettiAnims = React.useRef(
    Array.from({ length: NUM_CONFETTI }, () => new Animated.Value(0))
  ).current;
  const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

  React.useEffect(() => {
    if (visible && animate) {
      confettiAnims.forEach((anim, i) => {
        Animated.timing(anim, {
          toValue: 1,
          duration: 900 + Math.random() * 400,
          delay: i * 18,
          useNativeDriver: true,
        }).start(() => anim.setValue(0));
      });
    }
  }, [visible, animate]);

  if (!visible) return null;
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
      {confettiAnims.map((anim, i) => {
        const leftPx = Math.random() * (screenWidth - 24);
        const startY = -30 - Math.random() * 40;
        const endY = screenHeight + 30 + Math.random() * 40;
        const size = 12 + Math.random() * 12;
        const color = CARD_COLORS[i % CARD_COLORS.length][Math.round(Math.random())];
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: leftPx,
              top: startY,
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
              opacity: anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0.85, 0.85, 0] }),
              transform: [
                { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1.2, 1] }) },
                { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, endY - startY] }) },
                { rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${Math.random() > 0.5 ? 180 : -180}deg`] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

type CardStackProps = {
  tasks: Task[];
  questState: QuestState[QuestPeriod];
  onToggle: (period: QuestPeriod, taskId: string) => void;
  onInput: (period: QuestPeriod, taskId: string, value: string) => void;
  onCounter: (period: QuestPeriod, taskId: string, change: number) => void;
  onSkipTask: (period: QuestPeriod, taskId: string) => void;
  currentTaskIndex: number;
  setCurrentTaskIndex: (idx: number) => void;
  isSessionSubmitted: boolean;
  period: QuestPeriod;
  progressLabel: string;
  handleSessionSubmit: (period: QuestPeriod) => void;
};

function CardStack({
    tasks,
    questState,
    onToggle,
    onInput,
    onCounter,
    onSkipTask,
    currentTaskIndex,
    setCurrentTaskIndex,
    isSessionSubmitted,
    period,
    progressLabel,
    handleSessionSubmit,
}: CardStackProps) {
  const totalTasks = tasks.length;
  const currentTask = tasks[currentTaskIndex];
  const nextTask = currentTaskIndex < totalTasks - 1 ? tasks[currentTaskIndex + 1] : null;
  const taskState = questState[currentTask.id] || {};
  const isTaskDone = taskState.checked || taskState.skipped;
  const [anim] = React.useState(new Animated.Value(0));

  // Animate card transition
  const animateNext = () => {
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 250, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]).start();
  };
  React.useEffect(() => { anim.setValue(0); }, [currentTaskIndex]);

  const handleDone = () => {
    // Always set checked: true for all task types
    onToggle(period, currentTask.id);
    // Card transition is now handled after overlay hides
  };

  // Hide overlay and move to next card
  const handleCelebrationHide = () => {
    if (currentTaskIndex === totalTasks - 1) {
      // Last task, auto-submit session
      if (!isSessionSubmitted) {
        handleSessionSubmit(period);
      }
      // No need to advance index, UI will move to next period automatically
    } else {
      animateNext();
      setTimeout(() => setCurrentTaskIndex(currentTaskIndex + 1), 250);
    }
  };

  const handleSkip = () => {
    onSkipTask(period, currentTask.id);
    animateNext();
    setTimeout(() => setCurrentTaskIndex(currentTaskIndex + 1), 250);
  };

  // Card backgrounds
  const [bg1, bg2] = getCardColors(currentTaskIndex);
  const [nextBg1, nextBg2] = nextTask ? getCardColors(currentTaskIndex + 1) : [bg1, bg2];

  // Progress dots
  const dots = Array.from({ length: totalTasks }).map((_, i) => (
    <View key={i} style={{
      width: 8, height: 8, borderRadius: 4, margin: 3,
      backgroundColor: i === currentTaskIndex ? '#fff' : 'rgba(255,255,255,0.4)',
      borderWidth: i === currentTaskIndex ? 2 : 0,
      borderColor: '#fff',
    }} />
  ));

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 40 }}>
      <MagicalQuestCard>
        <Animated.View style={{
          width: '100%',
          minHeight: 224,
          borderRadius: 32,
          zIndex: 1,
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] }) }],
          opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] }),
        }}>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 10 }}>{i18n.t(currentTask.text)}</Text>
          {/* Input fields for all isInput tasks */}
          {currentTask.isInput && (
            period === 'workout' && ['1','2','3','4','5'].includes(currentTask.id) ? (
              <TextInput
                style={[styles.numberInput, { marginTop: 12, marginBottom: 8 }]} 
                value={taskState.value || ''}
                onChangeText={text => {
                  let val = text.replace(/[^0-9]/g, '');
                  if (currentTask.max && Number(val) > currentTask.max) val = String(currentTask.max);
                  onInput(period, currentTask.id, val);
                }}
                placeholder={`Enter number${currentTask.max ? ' (max ' + currentTask.max + ')' : ''}`}
                keyboardType="numeric"
                editable={!isTaskDone && !isSessionSubmitted}
                maxLength={currentTask.max ? String(currentTask.max).length : 4}
              />
            ) : (
              <TextInput
                style={[styles.textInput, { marginTop: 12, marginBottom: 8, minHeight: 60, maxHeight: 120, textAlignVertical: 'top' }]}
                value={taskState.value || ''}
                onChangeText={text => onInput(period, currentTask.id, text)}
                placeholder={"Describe the situation..."}
                editable={!isTaskDone && !isSessionSubmitted}
                multiline
                numberOfLines={4}
                maxLength={currentTask.max || 200}
              />
            )
          )}
          {/* Counter UI for isCounter tasks */}
          {currentTask.isCounter && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 8 }}>
              <TouchableOpacity
                style={[styles.counterButton, { marginRight: 8 }]} 
                onPress={() => {
                  console.log('Counter - pressed', period, currentTask.id);
                  onCounter(period, currentTask.id, -1);
                }}
                disabled={isTaskDone || isSessionSubmitted}
              >
                <Text style={{ fontSize: 20, color: '#4f46e5' }}>-</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 20, fontWeight: 'bold', minWidth: 32, textAlign: 'center', color: '#fff' }}>{taskState.count || 0}</Text>
              <TouchableOpacity
                style={[styles.counterButton, { marginLeft: 8 }]} 
                onPress={() => {
                  console.log('Counter + pressed', period, currentTask.id);
                  onCounter(period, currentTask.id, 1);
                }}
                disabled={isTaskDone || isSessionSubmitted}
              >
                <Text style={{ fontSize: 20, color: '#4f46e5' }}>+</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={{ flexDirection: 'row', marginTop: 32, justifyContent: 'space-between' }}>
            <TouchableOpacity
              style={{ backgroundColor: '#fff', borderRadius: 18, paddingVertical: 10, paddingHorizontal: 28, marginRight: 8 }}
              onPress={handleSkip}
              disabled={isTaskDone || isSessionSubmitted}
            >
              <Text style={{ color: bg1, fontWeight: 'bold', fontSize: 16 }}>{i18n.t('skip')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ backgroundColor: '#fff', borderRadius: 18, paddingVertical: 10, paddingHorizontal: 28, marginLeft: 8 }}
              onPress={handleDone}
              disabled={isTaskDone || isSessionSubmitted}
            >
              <Text style={{ color: bg1, fontWeight: 'bold', fontSize: 16 }}>{i18n.t('done')}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>{dots}</View>
          <Text style={{ color: '#fff', fontSize: 14, textAlign: 'center', marginTop: 8 }}>{progressLabel}</Text>
        </Animated.View>
      </MagicalQuestCard>
    </View>
  );
}

// Debounce timers for input fields (must persist across renders)
const debounceTimers: Record<string, NodeJS.Timeout | number> = {};

// Duolingo-style animated progress bar
function DuolingoProgressBar({ percent }: { percent: number }) {
  const animatedWidth = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: percent,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [percent]);

  return (
    <View style={duoStyles.container}>
      <Animated.View
        style={[
          duoStyles.fill,
          {
            width: animatedWidth.interpolate({
              inputRange: [0, 100],
              outputRange: ["0%", "100%"],
            }),
          },
        ]}
      >
        <Ionicons name="star" size={20} color="#fff" style={duoStyles.icon} />
      </Animated.View>
      <View style={duoStyles.textOverlay} pointerEvents="none">
        <Text style={duoStyles.percentText}>{percent}%</Text>
      </View>
    </View>
  );
}

const duoStyles = StyleSheet.create({
  container: {
    height: 24,
    backgroundColor: "#e0e7ff",
    borderRadius: 12,
    overflow: "hidden",
    width: "100%",
    marginVertical: 12,
    justifyContent: "center",
  },
  fill: {
    height: "100%",
    backgroundColor: "#4f46e5",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: 6,
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
  },
  icon: {
    marginLeft: 4,
  },
  textOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  percentText: {
    color: "#4f46e5",
    fontWeight: "bold",
    fontSize: 15,
  },
});

// Update JourneyZigZagPathBar to dynamically space nodes and mascot based on container width. Use onLayout to get container width, calculate nodeSpacing, and position nodes and mascot using absolute positioning so that the first and last nodes are always fully visible and nothing overflows. Remove fixed paddings and use dynamic left positions for nodes and mascot.
const JourneyZigZagPathBar = forwardRef(function JourneyZigZagPathBar({
  quests,
  questState,
  submittedSessions,
  activePeriod,
  onNodePress,
}: {
  quests: Quests;
  questState: QuestState;
  submittedSessions: Record<string, any>;
  activePeriod: QuestPeriod;
  onNodePress: (period: QuestPeriod) => void;
}, ref) {
  const periods: QuestPeriod[] = ['morning', 'workout', 'afternoon', 'evening', 'daily'];
  const nodeWidth = 38;
  const mascotSize = 56;
  const mascotOffsetY = 44;
  const [containerWidth, setContainerWidth] = useState(0);
  const nodeCount = periods.length;
  const nodeSpacing = containerWidth > 0 && nodeCount > 1
    ? (containerWidth - nodeWidth) / (nodeCount - 1)
    : 0;
  const activeIdx = periods.findIndex(p => p === activePeriod);

  // Calculate mascot's left and top position
  const mascotLeft = activeIdx * nodeSpacing + nodeWidth / 2 - mascotSize / 2;
  const mascotTop = (activeIdx % 2 === 0 ? 0 : 24) - mascotOffsetY;

  // Animated mascot movement using translateX/translateY
  const mascotAnimX = useRef(new Animated.Value(mascotLeft)).current;
  const mascotAnimY = useRef(new Animated.Value(mascotTop)).current;
  const mascotBounce = useRef(new Animated.Value(0)).current;
  const mascotSpin = useRef(new Animated.Value(0)).current;

  // Expose spin method to parent
  useImperativeHandle(ref, () => ({
    spin: () => {
      mascotSpin.setValue(0);
      Animated.timing(mascotSpin, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    },
  }));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(mascotAnimX, {
        toValue: mascotLeft,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(mascotAnimY, {
        toValue: mascotTop,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(mascotBounce, { toValue: -8, duration: 200, useNativeDriver: true }),
          Animated.timing(mascotBounce, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]),
        { iterations: 2 }
      ),
    ]).start();
  }, [mascotLeft, mascotTop]);

  // Interpolate spin value to degrees
  const mascotSpinDeg = mascotSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View
      style={{
        position: 'relative',
        height: 120,
        marginVertical: 24,
        width: '100%',
        justifyContent: 'center',
      }}
      onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {/* Animated mascot image */}
      <Animated.View
        style={{
          position: 'absolute',
          zIndex: 10,
          width: mascotSize,
          height: mascotSize,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [
            { translateX: mascotAnimX },
            { translateY: Animated.add(mascotAnimY, mascotBounce) },
            { rotate: mascotSpinDeg },
          ],
        }}
        pointerEvents='none'
      >
        <Image
          source={require('../../assets/mascot.png')}
          style={{ width: mascotSize, height: mascotSize }}
          resizeMode='contain'
        />
      </Animated.View>
      {/* Render nodes and connectors */}
      {containerWidth > 0 && periods.map((period, idx) => {
        const tasks = quests[period];
        const state = questState[period] || {};
        const completed = tasks.filter(
          t =>
            (t.isCounter && (state[t.id]?.count || 0) > 0) ||
            (t.isInput && (state[t.id]?.value || '').trim() !== '') ||
            state[t.id]?.checked ||
            state[t.id]?.skipped
        ).length;
        const total = tasks.length;
        const isActive = period === activePeriod;
        const isDone = submittedSessions[period]?.submitted;
        // Zig-zag: even index up, odd index down
        const verticalOffset = idx % 2 === 0 ? 0 : 24;
        const nodeLeft = idx * nodeSpacing;

        return (
          <React.Fragment key={period}>
            {/* Node and label */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onNodePress(period)}
              style={{
                position: 'absolute',
                left: nodeLeft,
                alignItems: 'center',
                marginTop: verticalOffset,
                marginBottom: 24 - verticalOffset,
                zIndex: 2,
                width: nodeWidth,
              }}
            >
              <View style={{
                width: nodeWidth, height: nodeWidth, borderRadius: nodeWidth / 2,
                backgroundColor: isDone ? '#4f46e5' : isActive ? '#fbbf24' : '#e0e7ff',
                borderWidth: isActive ? 3 : 2,
                borderColor: isActive ? '#fbbf24' : isDone ? '#4f46e5' : '#e0e7ff',
                alignItems: 'center', justifyContent: 'center',
                shadowColor: isActive ? '#fbbf24' : undefined,
                shadowOpacity: isActive ? 0.5 : 0,
                shadowRadius: isActive ? 8 : 0,
                elevation: isActive ? 4 : 0,
              }}>
                {isDone ? (
                  <Ionicons name="checkmark" size={22} color="#fff" />
                ) : (
                  <Text style={{
                    color: isActive
                      ? '#4f46e5'
                      : isDone
                        ? '#10b981'
                        : '#9ca3af',
                    fontWeight: 'bold',
                    fontSize: 16,
                  }}>
                    {completed}/{total}
                  </Text>
                )}
              </View>
              <Text
                style={{
                  fontSize: 13,
                  color: isActive
                    ? '#4f46e5'
                    : isDone
                      ? '#10b981'
                      : '#9ca3af',
                  marginTop: 6,
                  fontWeight: isActive ? 'bold' : 'normal',
                  textAlign: 'center',
                  width: 70,
                  textTransform: 'capitalize',
                }}
              >
                {period}
              </Text>
            </TouchableOpacity>
            {/* Diagonal connector */}
            {idx < periods.length - 1 && (
              <View style={{
                position: 'absolute',
                left: nodeLeft + nodeWidth,
                top: verticalOffset + nodeWidth / 2 + 2,
                width: nodeSpacing - nodeWidth,
                height: 24,
                zIndex: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <View style={{
                  width: nodeSpacing - nodeWidth,
                  height: 4,
                  backgroundColor: isDone || isActive ? '#4f46e5' : '#e0e7ff',
                  borderRadius: 2,
                  transform: [{ rotate: idx % 2 === 0 ? '20deg' : '-20deg' }],
                }} />
              </View>
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
});

// Replace Starfield with MovingStarfield for a moving magical effect
function MovingStarfield({ starCount = 20 }) {
  const stars = Array.from({ length: starCount }).map((_, i) => ({
    initialLeft: Math.random() * 280,
    initialTop: Math.random() * 180,
    size: 2 + Math.random() * 3,
    delay: Math.random() * 2000,
    speed: 10 + Math.random() * 20, // pixels per second
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((star, i) => {
        const leftAnim = useRef(new Animated.Value(star.initialLeft)).current;
        useEffect(() => {
          Animated.loop(
            Animated.sequence([
              Animated.timing(leftAnim, {
                toValue: 320, // move to the right edge
                duration: ((320 - star.initialLeft) / star.speed) * 1000,
                delay: star.delay,
                useNativeDriver: false,
              }),
              Animated.timing(leftAnim, {
                toValue: 0,
                duration: 0,
                useNativeDriver: false,
              }),
            ])
          ).start();
        }, []);
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: leftAnim,
              top: star.initialTop,
              width: star.size,
              height: star.size,
              borderRadius: star.size / 2,
              backgroundColor: '#fff',
              opacity: 0.8,
              shadowColor: '#fff',
              shadowOpacity: 0.8,
              shadowRadius: 4,
            }}
          />
        );
      })}
    </View>
  );
}

function MagicalQuestCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ borderRadius: 32, overflow: 'hidden', marginBottom: 20, width: 320, minHeight: 280 }}>
      <LinearGradient
        colors={['#a78bfa', '#f472b6', '#60a5fa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ minHeight: 280, padding: 28, justifyContent: 'center' }}
      >
        <MovingStarfield starCount={24} />
        {children}
      </LinearGradient>
    </View>
  );
}

// Add a MagicalCard component for the highlighted top card
function MagicalCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ borderRadius: 16, overflow: 'hidden', margin: 20 }}>
      <LinearGradient
        colors={['#6d28d9', '#4f46e5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 20, minHeight: 180, justifyContent: 'center' }}
      >
        <MovingStarfield starCount={18} />
        {children}
      </LinearGradient>
    </View>
  );
}

export default function JourneyScreen() {
  const [quests] = useState<Quests>(initialQuests)
  const [questState, setQuestState] = useState<QuestState>(() => getInitialQuestState(initialQuests))
  const [submittedSessions, setSubmittedSessions] = useState<Record<string, SessionData>>({});
  const [isDayComplete, setIsDayComplete] = useState(false);
  
  // Per-period current task index state
  const [currentTaskIndices, setCurrentTaskIndices] = useState<Record<QuestPeriod, number>>({
    morning: 0,
    workout: 0,
    afternoon: 0,
    evening: 0,
    daily: 0,
  });
  
  const { setQuestState: setCtxQuestState, streak, updateStats } = useQuest();
  
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Calculate stats
  const stats = React.useMemo(() => {
    let points = 0;
    let completed = 0;
    let total = 0;

    // Calculate points from submitted sessions
    points = Object.entries(submittedSessions).reduce((sum, [period, session]) => {
      if (session?.submitted) {
        console.log(`Session ${period} points:`, session.score);
        return sum + (session.score || 0);
      }
      return sum;
    }, 0);

    console.log('Total points from sessions:', points);

    // Calculate task completion stats
    Object.entries(quests).forEach(([period, tasks]) => {
      tasks.forEach((task) => {
        total++;
        const periodState = questState[period as QuestPeriod];
        if (!periodState) return;
        
        const state = periodState[task.id];
        if (!state) return;
        
        if (task.isCounter) {
          if ((state.count || 0) > 0) {
            completed++;
          }
        } else if (task.isInput) {
          const val = state.value || '';
          if (task.id === "5" && period === "workout") {
            if (val !== "" && Number(val) > 0) completed++;
          } else if (val.trim() !== "") {
            completed++;
          }
        } else if (state.checked) {
          completed++;
        }
      });
    });

    // Calculate percentage based on completed tasks
    const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { 
      points, 
      completed, 
      total,
      percentComplete: Math.min(100, percentComplete) // Cap at 100%
    };
  }, [submittedSessions, questState, quests]);
  
  // Update the context with the latest stats
  React.useEffect(() => {
    updateStats({
      points: stats.points,
      completed: stats.completed,
      total: stats.total
    });
  }, [stats, updateStats]);
  
  const { points: totalPoints, completed: completedTasks, total: totalTasks, percentComplete } = stats;
  
  // Load saved sessions and quest state on mount
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const auth = getAuth();
        
        // Wait for auth state to be ready
        return new Promise<void>((resolve) => {
          const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (!user) {
              console.log('No user signed in');
              unsubscribe();
              resolve();
              return;
            }

            try {
              // Load data from Firestore
              const data = await loadSessions();
              
              if (data) {
                // Update local state with Firestore data
                setSubmittedSessions(data.sessions);
                
                // Update quest state if available
                const updatedQuestState = { ...questState };
                let hasUpdates = false;
                
                Object.entries(data.sessions).forEach(([period, session]) => {
                  console.log(`Loading session for ${period}:`, session);
                  if (session.questState) {
                    updatedQuestState[period as QuestPeriod] = {
                      ...updatedQuestState[period as QuestPeriod],
                      ...session.questState
                    };
                    hasUpdates = true;
                  }
                });
                
                if (hasUpdates) {
                  console.log('Updating quest state with:', updatedQuestState);
                  setQuestState(updatedQuestState);
                } else {
                  console.log('No quest state updates needed');
                }
              }
              
              // Set up real-time listener
              const unsubscribeFirestore = subscribeToJourneyUpdates(
                new Date().toISOString().split('T')[0],
                (updatedData) => {
                  if (updatedData) {
                    setSubmittedSessions(updatedData.sessions);
                  }
                }
              );
              
              // Clean up function
              return () => {
                unsubscribe();
                if (unsubscribeFirestore) unsubscribeFirestore();
              };
            } catch (error) {
              console.error('Error loading Firestore data:', error);
            } finally {
              resolve();
            }
          });
        });
      } catch (error) {
        console.error('Error in loadSavedData:', error);
      }
    };
    
    loadSavedData();
  }, []);
  
  const calculateSessionScore = (period: string) => {
    const sessionTasks = quests[period as QuestPeriod];
    return sessionTasks.reduce((total, task) => {
      const taskState = questState[period as QuestPeriod]?.[task.id];
      if (taskState?.checked) {
        return total + (task.points || 0);
      } else if (task.isCounter && taskState?.count) {
        return total + ((task.points || 0) * taskState.count);
      } else if (task.isInput && taskState?.value) {
        return total + (task.points || 0);
      }
      return total;
    }, 0);
  };

  const handleSessionSubmit = async (period: QuestPeriod) => {
    try {
      const score = calculateSessionScore(period);
      
      // Get the current quest state for this period
      const currentQuestState = questState[period] || {};
      
      // Update local state optimistically first
      const sessionData = {
        submitted: true,
        score: score,
        timestamp: new Date().toISOString(),
        questState: currentQuestState
      };
      
      console.log('Submitting session with quest state:', {
        period,
        sessionData,
        currentQuestState
      });
      
      setSubmittedSessions(prev => ({
        ...prev,
        [period]: sessionData
      }));
      
      // Save to Firestore
      await saveSession(period, sessionData);
      
      // Update daily totals
      await updateDailyTotals();
      
      // Scroll to top after submission
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: true });
      }
      
      // Log confirmation of next period
      setTimeout(() => {
        const periods: QuestPeriod[] = ['morning', 'workout', 'afternoon', 'evening', 'daily'];
        const firstIncompletePeriod = periods.find(period => {
          const periodTasks = quests[period];
          const periodState = questState[period] || {};
          return periodTasks.some(task => !periodState[task.id]?.checked && !periodState[task.id]?.skipped);
        });
        const activePeriod = firstIncompletePeriod || periods[0];
        console.log('[Journey] Next active period is now:', activePeriod);
      }, 500);
    } catch (error) {
      console.error('Error saving session submission:', error);
      // Revert local state on error
      setSubmittedSessions(prev => ({
        ...prev,
        [period]: { ...prev[period], submitted: false }
      }));
    }
  };
  // Sync with context
  React.useEffect(() => {
    setCtxQuestState(questState)
  }, [questState, setCtxQuestState])

  const handleClear = (period: QuestPeriod) => {
    setQuestState((prev) => {
      const newPeriodState = { ...prev[period] }
      quests[period].forEach((task) => {
        if (task.isCounter) {
          newPeriodState[task.id] = { count: 0 }
        } else if (task.isInput) {
          newPeriodState[task.id] = { value: "" }
        } else {
          newPeriodState[task.id] = { checked: false }
        }
      })
      return { ...prev, [period]: newPeriodState }
    })
  }

  const handleToggle = async (period: QuestPeriod, taskId: string) => {
    const newChecked = !questState[period]?.[taskId]?.checked;
    // Optimistic update
    setQuestState(prev => {
      const updated = {
        ...prev,
        [period]: {
          ...prev[period],
          [taskId]: {
            ...prev[period]?.[taskId],
            checked: newChecked
          }
        }
      };
      // Auto-save after state update
      saveSession(period, {
        submitted: !!submittedSessions[period]?.submitted,
        score: calculateSessionScore(period),
        timestamp: new Date().toISOString(),
        questState: updated[period]
      });
      // Trigger mascot spin animation
      if (progressBarRef.current && progressBarRef.current.spin) {
        progressBarRef.current.spin();
      }
      return updated;
    });
  };

  const handleCounter = (period: QuestPeriod, taskId: string, amount: number) => {
    console.log('handleCounter called', period, taskId, amount);
    setQuestState(prev => {
      const currentCount = prev[period]?.[taskId]?.count || 0;
      const newCount = Math.max(0, currentCount + amount);
      const updated = {
        ...prev,
        [period]: {
          ...prev[period],
          [taskId]: {
            ...prev[period]?.[taskId],
            count: newCount
          }
        }
      };
      // Save to Firestore after updating local state
      saveSession(period, {
        submitted: !!submittedSessions[period]?.submitted,
        score: calculateSessionScore(period),
        timestamp: new Date().toISOString(),
        questState: updated[period]
      });
      return updated;
    });
  };

  const handleInput = (period: QuestPeriod, taskId: string, text: string) => {
    let value = text;
    if (period === 'workout' && ['1','2','3','4','5'].includes(taskId)) {
      value = text.replace(/[^0-9]/g, '');
      const max = quests[period].find(t => t.id === taskId)?.max;
      if (max && Number(value) > max) value = String(max);
    }
    setQuestState(prev => {
      const updated = {
        ...prev,
        [period]: {
          ...prev[period],
          [taskId]: {
            ...prev[period]?.[taskId],
            value
          }
        }
      };
      // Debounce Firestore save
      if (debounceTimers[`${period}-${taskId}`]) {
        clearTimeout(debounceTimers[`${period}-${taskId}`]);
      }
      debounceTimers[`${period}-${taskId}`] = setTimeout(() => {
        saveSession(period, {
          submitted: !!submittedSessions[period]?.submitted,
          score: calculateSessionScore(period),
          timestamp: new Date().toISOString(),
          questState: updated[period]
        });
      }, 500); // 500ms debounce
      return updated;
    });
  };

  const handleSkipTask = (period: QuestPeriod, taskId: string) => {
    setQuestState(prev => {
      const updated = {
        ...prev,
        [period]: {
          ...prev[period],
          [taskId]: {
            ...prev[period]?.[taskId],
            skipped: true,
            skippedTimestamp: new Date().toISOString()
          }
        }
      };
      // Auto-save after state update
      saveSession(period, {
        submitted: !!submittedSessions[period]?.submitted,
        score: calculateSessionScore(period),
        timestamp: new Date().toISOString(),
        questState: updated[period]
      });
      return updated;
    });
  };

  // Helper to find the first incomplete (not checked/skipped) task index for a period
  const getFirstIncompleteTaskIndex = (period: QuestPeriod, tasks: Task[], state: QuestState) => {
    const periodState = state[period] || {};
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      const s = periodState[t.id];
      if (!s || (!s.checked && !s.skipped)) {
        return i;
      }
    }
    return tasks.length - 1; // fallback to last
  };

  // On mount or when questState changes, update currentTaskIndices to resume progress
  useEffect(() => {
    setCurrentTaskIndices((prev) => {
      const updated: Record<QuestPeriod, number> = { ...prev };
      (Object.keys(quests) as QuestPeriod[]).forEach((period) => {
        updated[period] = getFirstIncompleteTaskIndex(period, quests[period], questState);
      });
      return updated;
    });
  }, [questState, quests]);

  // Daily reset: if the date changes, reset all progress
  useEffect(() => {
    const checkAndResetDaily = async () => {
      const today = new Date().toISOString().split('T')[0];
      const lastDate = await AsyncStorage.getItem('journey_last_date');
      if (lastDate !== today) {
        setQuestState(getInitialQuestState(quests));
        setCurrentTaskIndices({ morning: 0, workout: 0, afternoon: 0, evening: 0, daily: 0 });
        await AsyncStorage.setItem('journey_last_date', today);
      }
    };
    checkAndResetDaily();
  }, [quests]);

  // Auto-submit a period when all its tasks are completed or skipped
  useEffect(() => {
    const periods: QuestPeriod[] = ['morning', 'workout', 'afternoon', 'evening', 'daily'];
    periods.forEach(period => {
      const periodTasks = quests[period];
      const periodState = questState[period] || {};
      const allDone = periodTasks.every(task => {
        const state = periodState[task.id];
        if (!state) return false;
        if (task.isCounter) return (state.count || 0) > 0;
        if (task.isInput) {
          if (task.id === "5" && period === "workout") {
            return state.value !== "" && Number(state.value) > 0;
          }
          return (state.value || "").trim() !== "";
        }
        return state.checked || state.skipped;
      });
      if (allDone && !submittedSessions[period]?.submitted) {
        handleSessionSubmit(period);
      }
    });
  }, [questState, quests, submittedSessions]);

  // In JourneyScreen, show only the current period (first incomplete), lock others
  const periods: QuestPeriod[] = ['morning', 'workout', 'afternoon', 'evening', 'daily'];
  const firstIncompletePeriod = periods.find(period => {
    const periodTasks = quests[period];
    const periodState = questState[period] || {};
    return periodTasks.some(task => !periodState[task.id]?.checked && !periodState[task.id]?.skipped);
  });
  const activePeriod = firstIncompletePeriod || periods[0];

  const [showAllDoneModal, setShowAllDoneModal] = useState(false);

  // Check if all quests are done and submitted
  const allPeriods = ['morning', 'workout', 'afternoon', 'evening', 'daily'] as QuestPeriod[];
  const allDone = allPeriods.every(period => submittedSessions[period]?.submitted);

  useEffect(() => {
    if (allDone) setShowAllDoneModal(true);
    else setShowAllDoneModal(false);
  }, [allDone]);

  const progressBarRef = useRef<{ spin: () => void } | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<QuestPeriod | null>(null);
  const [language, setLanguageState] = useState(i18n.locale || 'en');

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang as 'en' | 'mr');
    setLanguageState(lang);
  };

  return (
    <ImageBackground
      source={require('../../assets/bg-pattern.png')}
      style={{ flex: 1 }}
      resizeMode="repeat"
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{i18n.t('welcome')}</Text>
            <View style={styles.languageContainer}>
              <Picker
                selectedValue={language}
                style={styles.languagePicker}
                onValueChange={handleLanguageChange}
              >
                <Picker.Item label="English" value="en" />
                <Picker.Item label="मराठी" value="mr" />
              </Picker>
            </View>
            <View style={styles.headerPoints}>
              <Ionicons name="star" size={16} color="#f59e0b" />
              <Text style={styles.headerPointsText}>{totalPoints} {i18n.t('points')}</Text>
            </View>
          </View>

          {/* Journey Card */}
          <MagicalCard>
            <View style={styles.journeyHeader}>
              <Text style={styles.journeyTitle}>My Journey Today</Text>
              <View>
                <Text style={styles.journeyPoints}>{totalPoints}</Text>
                <Text style={styles.journeyPointsLabel}>Total Points</Text>
              </View>
            </View>
            <Text style={styles.journeySubtitle}>Ready to become your best self?</Text>
            <View style={styles.progressContainer}>
              <Text style={styles.progressLabel}>Daily Progress</Text>
            </View>
            <JourneyZigZagPathBar
              ref={progressBarRef}
              quests={quests}
              questState={questState}
              submittedSessions={submittedSessions}
              activePeriod={activePeriod}
              onNodePress={setSelectedPeriod}
            />
          </MagicalCard>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="flash-outline" size={24} color="#f59e0b" />
              <Text style={styles.statValue}>3</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="ribbon-outline" size={24} color="#6d28d9" />
              <Text style={styles.statValue}>2</Text>
              <Text style={styles.statLabel}>Badges</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#10b981" />
              <Text style={styles.statValue}>{percentComplete}%</Text>
              <Text style={styles.statLabel}>Complete</Text>
            </View>
          </View>

          {/* Quests */}
          {!allDone && (
            <View style={styles.questsContainer}>
              <CardStack
                tasks={quests[activePeriod]}
                questState={questState[activePeriod]}
                onToggle={handleToggle}
                onInput={handleInput}
                onCounter={handleCounter}
                onSkipTask={handleSkipTask}
                currentTaskIndex={currentTaskIndices[activePeriod]}
                setCurrentTaskIndex={idx => setCurrentTaskIndices(prev => ({ ...prev, [activePeriod]: idx }))}
                isSessionSubmitted={!!submittedSessions[activePeriod]?.submitted}
                period={activePeriod}
                progressLabel={`${activePeriod.charAt(0).toUpperCase() + activePeriod.slice(1)} Quest`}
                handleSessionSubmit={handleSessionSubmit}
              />
            </View>
          )}
          <View style={{ height: 40 }} />

        </ScrollView>
        {/* All Done Modal */}
        <Modal
          visible={showAllDoneModal}
          transparent
          animationType="fade"
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', maxWidth: 320 }}>
              <Ionicons name="trophy" size={64} color="#f59e0b" style={{ marginBottom: 16 }} />
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#4f46e5', textAlign: 'center', marginBottom: 12 }}>
                All quests done for today!
              </Text>
              <Text style={{ fontSize: 18, color: '#22223b', textAlign: 'center', marginBottom: 8 }}>
                Come back tomorrow and keep winning and keep rising.
              </Text>
              <Text style={{ fontSize: 18, color: '#22223b', textAlign: 'center', fontWeight: 'bold', marginBottom: 24 }}>
                Never give up!!
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: '#4f46e5', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32 }}
                onPress={() => setShowAllDoneModal(false)}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Back to App</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        {/* Modal for viewing tasks of a period */}
        <Modal
          visible={!!selectedPeriod}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedPeriod(null)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, minWidth: 300, maxWidth: 340, maxHeight: 500 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: '#4f46e5', textAlign: 'center' }}>
                {selectedPeriod ? selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1) : ''} {i18n.t('tasks')}
              </Text>
              <FlatList
                data={selectedPeriod ? quests[selectedPeriod] : []}
                keyExtractor={item => item.id}
                renderItem={({ item }) => {
                  const state = selectedPeriod ? questState[selectedPeriod]?.[item.id] : undefined;
                  let status = '';
                  if (item.isCounter) {
                    status = (state?.count || 0) > 0 ? `Count: ${state?.count}` : 'Not done';
                  } else if (item.isInput) {
                    status = state?.value ? `Input: ${state.value}` : 'Not done';
                  } else if (state?.checked) {
                    status = 'Done';
                  } else if (state?.skipped) {
                    status = 'Skipped';
                  } else {
                    status = 'Not done';
                  }
                  return (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <Ionicons
                        name={status === 'Done' ? 'checkmark-circle' : status === 'Skipped' ? 'close-circle' : 'ellipse-outline'}
                        size={20}
                        color={status === 'Done' ? '#10b981' : status === 'Skipped' ? '#f87171' : '#9ca3af'}
                        style={{ marginRight: 10 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, color: '#22223b' }}>{item.text}</Text>
                        <Text style={{ fontSize: 12, color: '#6b7280' }}>{status}</Text>
                      </View>
                    </View>
                  );
                }}
                ListEmptyComponent={<Text style={{ color: '#9ca3af', textAlign: 'center' }}>No tasks found.</Text>}
                style={{ marginBottom: 16 }}
              />
              <TouchableOpacity
                style={{ backgroundColor: '#4f46e5', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 24, alignSelf: 'center' }}
                onPress={() => setSelectedPeriod(null)}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{i18n.t('close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: "#ffffff",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  headerPoints: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerPointsText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  journeyCard: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
  },
  journeyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  journeyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    width: "60%",
  },
  journeyPoints: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "right",
  },
  journeyPointsLabel: {
    fontSize: 14,
    color: "#e0e7ff",
    textAlign: "right",
  },
  journeySubtitle: {
    fontSize: 16,
    color: "#e0e7ff",
    marginTop: 8,
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  progressLabel: {
    fontSize: 14,
    color: "#e0e7ff",
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ffffff",
  },
  progressBar: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 4,
    marginTop: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 4,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    marginTop: -10,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  doneButtonContainer: {
    marginTop: 24,
    marginBottom: 12,
    marginHorizontal: 12,
  },
  doneButton: {
    flexDirection: 'row',
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  disabledButton: {
    backgroundColor: '#6b7280',
    shadowColor: '#6b7280',
  },
  disabledButtonContainer: {
    opacity: 0.8,
  },
  doneButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  doneButtonIcon: {
    marginLeft: 8,
  },
  emptyState: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  questsContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  questCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  questHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  questIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  questTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  questPhrase: {
    fontSize: 14,
    color: "#6b7280",
    fontStyle: "italic",
  },
  questProgressText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "bold",
    marginLeft: 8,
  },
  questTasks: {
    gap: 16,
  },
  taskItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  taskInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    flex: 1,
  },
  taskCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#d1d5db",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  taskCheckboxChecked: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  taskText: {
    fontSize: 16,
    flexShrink: 1,
    lineHeight: 22,
  },
  taskTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  taskTag: {
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  taskTagText: {
    fontSize: 12,
    color: "#4b5563",
  },
  taskPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  taskCount: {
    marginHorizontal: 4,
    minWidth: 24,
    textAlign: 'center',
  },
  taskPointsText: {
    marginLeft: 8,
    color: '#6b7280',
    fontSize: 12,
  },
  counter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  counterButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
  },
  counterValue: {
    fontSize: 16,
    fontWeight: "bold",
    minWidth: 20,
    textAlign: "center",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    lineHeight: 20,
    textAlignVertical: "top",
    minHeight: 100,
    width: "100%",
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    color: "#1f2937",
  },
  numberInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 8,
    width: 80,
    textAlign: "center",
    fontSize: 16,
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    color: "#1f2937",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 14,
    color: "#6b7280",
  },
  mediaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  mediaButtonText: {
    fontSize: 14,
    color: "#6b7280",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  clearButton: {
    backgroundColor: "#f3f4f6",
  },
  submitButton: {
    backgroundColor: "#e0fdf4",
  },
  clearButtonText: {
    color: "#64748b",
    fontWeight: "bold",
    fontSize: 14,
  },
  questActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 16,
  },
  submitButtonText: {
    color: "#10b981",
    fontWeight: "bold",
    fontSize: 14,
  },
  languageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languagePicker: {
    width: 120,
    height: 50,
    color: '#4f46e5',
  },
})
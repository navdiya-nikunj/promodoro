'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  Settings,
  X,
  Volume2,
  VolumeX,
  Palette,
  Clock,
  Target,
  Star,
  BarChart2,
} from 'lucide-react';

const PomodoroTimer = () => {
  // Timer state
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState('work');
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [sessionCount, setSessionCount] = useState({ today: 0, total: 0 });

  // Task state
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [activeTask, setActiveTask] = useState(null);

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [theme, setTheme] = useState('gradient');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Settings state
  const [settings, setSettings] = useState({
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    longBreakInterval: 4,
    autoStartBreaks: true,
    autoStartWork: false,
    soundVolume: 0.5,
    notifications: true,
  });

  const intervalRef = useRef(null);
  const notificationRef = useRef(null);

  const themes = {
    gradient: {
      bg: 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900',
      card: 'bg-white/10 backdrop-blur-lg border-white/20',
      accent: 'from-purple-500 to-pink-500',
    },
    dark: {
      bg: 'bg-gray-900',
      card: 'bg-gray-800/50 backdrop-blur-lg border-gray-700/50',
      accent: 'from-blue-500 to-cyan-500',
    },
    ocean: {
      bg: 'bg-gradient-to-br from-blue-900 via-teal-900 to-cyan-900',
      card: 'bg-white/10 backdrop-blur-lg border-white/20',
      accent: 'from-teal-400 to-blue-500',
    },
    forest: {
      bg: 'bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900',
      card: 'bg-white/10 backdrop-blur-lg border-white/20',
      accent: 'from-emerald-400 to-green-500',
    },
    sunset: {
      bg: 'bg-gradient-to-br from-orange-900 via-red-900 to-pink-900',
      card: 'bg-white/10 backdrop-blur-lg border-white/20',
      accent: 'from-orange-400 to-red-500',
    },
  };

  const modes = {
    work: {
      duration: settings.workDuration * 60,
      label: 'Focus Time',
      color: 'bg-red-500',
      icon: <Target size={20} />,
      description: 'Time to focus on your tasks',
    },
    shortBreak: {
      duration: settings.shortBreakDuration * 60,
      label: 'Short Break',
      color: 'bg-green-500',
      icon: <Clock size={20} />,
      description: 'Take a quick breather',
    },
    longBreak: {
      duration: settings.longBreakDuration * 60,
      label: 'Long Break',
      color: 'bg-blue-500',
      icon: <Star size={20} />,
      description: 'Well-deserved longer break',
    },
  };

  // Initialize timer when settings change
  useEffect(() => {
    if (!isRunning) {
      setTimeLeft(modes[mode].duration);
    }
  }, [settings, mode]);

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);

      if (timeLeft === 0 && isRunning) {
        handleTimerComplete();
      }
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft, mode, pomodoroCount]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    playNotificationSound();
    showNotification();

    if (mode === 'work') {
      setPomodoroCount(prev => prev + 1);
      setSessionCount(prev => ({
        ...prev,
        today: prev.today + 1,
        total: prev.total + 1,
      }));

      // Mark active task as completed if exists
      if (activeTask) {
        updateTaskPomodoros(activeTask);
      }

      // Determine next mode
      const nextMode =
        (pomodoroCount + 1) % settings.longBreakInterval === 0
          ? 'longBreak'
          : 'shortBreak';
      switchMode(nextMode, settings.autoStartBreaks);
    } else {
      switchMode('work', settings.autoStartWork);
    }
  };

  const showNotification = () => {
    if (settings.notifications && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        const notification = new Notification(
          `${modes[mode].label} Complete!`,
          {
            body: mode === 'work' ? 'Time for a break!' : 'Ready to focus?',
            icon: '🍅',
          }
        );
        notificationRef.current = notification;
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  };

  const playNotificationSound = () => {
    if (!soundEnabled) return;

    try {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(
        mode === 'work' ? 800 : 600,
        audioContext.currentTime
      );
      gainNode.gain.setValueAtTime(
        settings.soundVolume * 0.1,
        audioContext.currentTime
      );

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.3);

      // Double beep for work sessions
      if (mode === 'work') {
        setTimeout(() => {
          const osc2 = audioContext.createOscillator();
          const gain2 = audioContext.createGain();
          osc2.connect(gain2);
          gain2.connect(audioContext.destination);
          osc2.frequency.setValueAtTime(1000, audioContext.currentTime);
          gain2.gain.setValueAtTime(
            settings.soundVolume * 0.1,
            audioContext.currentTime
          );
          osc2.start();
          osc2.stop(audioContext.currentTime + 0.3);
        }, 400);
      }
    } catch (error) {
      console.log('Audio not supported');
    }
  };

  const switchMode = (newMode, autoStart = false) => {
    setMode(newMode);
    setTimeLeft(modes[newMode].duration);
    if (autoStart) {
      setIsRunning(true);
    }
  };

  const formatTime = seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const handleStart = () => setIsRunning(true);
  const handlePause = () => setIsRunning(false);

  const handleStop = () => {
    setIsRunning(false);
    setTimeLeft(modes[mode].duration);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(modes[mode].duration);
    setPomodoroCount(0);
    setMode('work');
    setActiveTask(null);
  };

  const addTask = () => {
    if (newTask.trim()) {
      const task = {
        id: Date.now(),
        text: newTask,
        completed: false,
        pomodorosEstimated: 1,
        pomodorosSpent: 0,
        createdAt: new Date(),
      };
      setTasks(prev => [task, ...prev]);
      setNewTask('');
    }
  };

  const toggleTask = id => {
    setTasks(prev =>
      prev.map(task =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const deleteTask = id => {
    setTasks(prev => prev.filter(task => task.id !== id));
    if (activeTask === id) setActiveTask(null);
  };

  const setTaskActive = id => {
    setActiveTask(activeTask === id ? null : id);
  };

  const updateTaskPomodoros = (id, estimate) => {
    if (estimate) {
      setTasks(prev =>
        prev.map(task =>
          task.id === id ? { ...task, pomodorosEstimated: estimate } : task
        )
      );
    } else {
      // Increment spent pomodoros
      setTasks(prev =>
        prev.map(task =>
          task.id === id
            ? { ...task, pomodorosSpent: task.pomodorosSpent + 1 }
            : task
        )
      );
    }
  };

  const progress =
    ((modes[mode].duration - timeLeft) / modes[mode].duration) * 100;
  const currentTheme = themes[theme];

  return (
    <div
      className={`min-h-screen ${currentTheme.bg} transition-all duration-500 relative overflow-hidden`}
    >
      {/* Animated background elements */}
      <div className='absolute inset-0 overflow-hidden pointer-events-none'>
        <div className='absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-pulse'></div>
        <div className='absolute -bottom-40 -left-40 w-96 h-96 bg-white/3 rounded-full blur-3xl animate-pulse delay-2000'></div>
      </div>

      <div className='relative z-10 max-w-7xl mx-auto p-4'>
        {/* Header */}
        <div className='text-center mb-8'>
          <div className='flex items-center justify-center gap-4 mb-4'>
            <div className='text-4xl'>🍅</div>
            <h1 className='text-4xl md:text-6xl font-bold text-white'>
              PomodoroFlow
            </h1>
          </div>
          <p className='text-slate-300 text-lg'>
            Master your focus, one pomodoro at a time
          </p>

          {/* Quick stats */}
          <div className='flex justify-center gap-6 mt-6'>
            <div className='text-center'>
              <div className='text-2xl font-bold text-white'>
                {sessionCount.today}
              </div>
              <div className='text-sm text-slate-400'>Today</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold text-white'>
                {pomodoroCount}
              </div>
              <div className='text-sm text-slate-400'>This Session</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold text-white'>
                {tasks.filter(t => t.completed).length}
              </div>
              <div className='text-sm text-slate-400'>Tasks Done</div>
            </div>
          </div>
        </div>

        <div className='grid lg:grid-cols-3 gap-8'>
          {/* Timer Section */}
          <div
            className={`lg:col-span-2 ${currentTheme.card} rounded-3xl p-8 shadow-2xl border transition-all duration-300 hover:shadow-3xl`}
          >
            {/* Mode indicator */}
            <div className='text-center mb-8'>
              <div
                className={`inline-flex items-center gap-3 px-6 py-3 rounded-full text-white font-semibold ${modes[mode].color} shadow-lg`}
              >
                {modes[mode].icon}
                <span className='text-lg'>{modes[mode].label}</span>
              </div>
              <p className='text-slate-300 mt-2'>{modes[mode].description}</p>
              {activeTask && (
                <div className='mt-3 p-3 bg-white/10 rounded-lg'>
                  <div className='text-sm text-slate-400'>Working on:</div>
                  <div className='text-white font-medium'>
                    {tasks.find(t => t.id === activeTask)?.text}
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Circular Progress */}
            <div className='relative w-80 h-80 mx-auto mb-8'>
              <svg
                className='w-full h-full transform -rotate-90'
                viewBox='0 0 100 100'
              >
                {/* Background circle */}
                <circle
                  cx='50'
                  cy='50'
                  r='45'
                  fill='none'
                  stroke='rgba(255,255,255,0.1)'
                  strokeWidth='4'
                />
                {/* Progress circle */}
                <circle
                  cx='50'
                  cy='50'
                  r='45'
                  fill='none'
                  stroke='url(#progressGradient)'
                  strokeWidth='4'
                  strokeLinecap='round'
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${
                    2 * Math.PI * 45 * (1 - progress / 100)
                  }`}
                  className='transition-all duration-1000 ease-out'
                  style={{
                    filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.5))',
                  }}
                />
                {/* Gradient definition */}
                <defs>
                  <linearGradient
                    id='progressGradient'
                    x1='0%'
                    y1='0%'
                    x2='100%'
                    y2='0%'
                  >
                    <stop offset='0%' stopColor='#8b5cf6' />
                    <stop offset='100%' stopColor='#ec4899' />
                  </linearGradient>
                </defs>
              </svg>

              {/* Timer display */}
              <div className='absolute inset-0 flex flex-col items-center justify-center'>
                <span className='text-6xl font-bold text-white mb-2 font-mono tracking-tight'>
                  {formatTime(timeLeft)}
                </span>
                <div className='flex items-center gap-2 text-slate-400'>
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
                    }`}
                  ></div>
                  <span className='text-sm'>
                    {isRunning ? 'Running' : 'Paused'}
                  </span>
                </div>
              </div>

              {/* Progress indicators */}
              <div className='absolute -bottom-4 left-1/2 transform -translate-x-1/2'>
                <div className='flex gap-2'>
                  {[...Array(settings.longBreakInterval)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        i < pomodoroCount % settings.longBreakInterval
                          ? 'bg-gradient-to-r from-purple-400 to-pink-400'
                          : 'bg-white/20'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Enhanced Controls */}
            <div className='flex justify-center gap-4 mb-8'>
              {!isRunning ? (
                <button
                  onClick={handleStart}
                  className='bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white p-4 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95'
                >
                  <Play size={28} className='ml-1' />
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  className='bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white p-4 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95'
                >
                  <Pause size={28} />
                </button>
              )}
              <button
                onClick={handleStop}
                className='bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white p-4 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95'
              >
                <Square size={28} />
              </button>
              <button
                onClick={handleReset}
                className='bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white p-4 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95'
              >
                <RotateCcw size={28} />
              </button>
            </div>

            {/* Quick Mode Switchers */}
            <div className='flex justify-center gap-3 mb-6'>
              {Object.entries(modes).map(([key, { label, icon }]) => (
                <button
                  key={key}
                  onClick={() => switchMode(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    mode === key
                      ? 'bg-white text-slate-900 shadow-lg'
                      : 'bg-white/20 text-white hover:bg-white/30 hover:scale-105'
                  }`}
                >
                  {icon}
                  <span className='hidden sm:inline'>{label}</span>
                </button>
              ))}
            </div>

            {/* Settings and Stats Controls */}
            <div className='flex justify-center gap-3'>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-3 rounded-full transition-all duration-200 ${
                  soundEnabled
                    ? 'bg-white/20 text-white'
                    : 'bg-red-500/20 text-red-400'
                } hover:scale-105`}
              >
                {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className='bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-all duration-200 hover:scale-105'
              >
                <Settings size={20} />
              </button>
              <button
                onClick={() => setShowStats(true)}
                className='bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-all duration-200 hover:scale-105'
              >
                <BarChart2 size={20} />
              </button>
            </div>
          </div>

          {/* Enhanced Task List */}
          <div
            className={`${currentTheme.card} rounded-3xl p-8 shadow-2xl border transition-all duration-300 hover:shadow-3xl`}
          >
            <div className='flex items-center justify-between mb-6'>
              <h2 className='text-2xl font-bold text-white'>Tasks</h2>
              <div className='flex items-center gap-2 text-sm text-slate-400'>
                <span>{tasks.filter(t => !t.completed).length}</span>
                <span>remaining</span>
              </div>
            </div>

            {/* Enhanced Add Task */}
            <div className='space-y-3 mb-6'>
              <div className='flex gap-2'>
                <input
                  type='text'
                  value={newTask}
                  onChange={e => setNewTask(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && addTask()}
                  placeholder='What needs to be done?'
                  className='flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200'
                />
                <button
                  onClick={addTask}
                  className='bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white p-3 rounded-xl transition-all duration-200 hover:scale-105'
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            {/* Enhanced Task List */}
            <div className='space-y-3 max-h-96 overflow-y-auto'>
              {tasks.length === 0 ? (
                <div className='text-center text-slate-400 py-12'>
                  <div className='text-4xl mb-4'>📝</div>
                  <p className='text-lg mb-2'>No tasks yet</p>
                  <p className='text-sm'>Add a task above to get started!</p>
                </div>
              ) : (
                tasks.map(task => (
                  <div
                    key={task.id}
                    className={`group p-4 rounded-xl transition-all duration-200 border ${
                      task.completed
                        ? 'bg-green-500/10 border-green-500/30'
                        : activeTask === task.id
                        ? 'bg-purple-500/10 border-purple-500/30 ring-2 ring-purple-500/20'
                        : 'bg-white/5 hover:bg-white/10 border-white/10'
                    }`}
                  >
                    <div className='flex items-start gap-3'>
                      <button
                        onClick={() => toggleTask(task.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 mt-0.5 ${
                          task.completed
                            ? 'bg-green-500 border-green-500 scale-110'
                            : 'border-slate-400 hover:border-white hover:scale-110'
                        }`}
                      >
                        {task.completed && (
                          <Check size={14} className='text-white' />
                        )}
                      </button>

                      <div className='flex-1 min-w-0'>
                        <div
                          className={`font-medium transition-all duration-200 ${
                            task.completed
                              ? 'text-slate-400 line-through'
                              : 'text-white'
                          }`}
                        >
                          {task.text}
                        </div>

                        <div className='flex items-center gap-2 mt-2'>
                          <button
                            onClick={() => setTaskActive(task.id)}
                            className={`px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                              activeTask === task.id
                                ? 'bg-purple-500 text-white'
                                : 'bg-white/10 text-slate-400 hover:bg-white/20 hover:text-white'
                            }`}
                          >
                            {activeTask === task.id ? 'Active' : 'Set Active'}
                          </button>

                          <div className='flex items-center gap-1 text-xs text-slate-400'>
                            <span>{task.pomodorosSpent}</span>
                            <span>/</span>
                            <input
                              type='number'
                              min='1'
                              max='20'
                              value={task.pomodorosEstimated}
                              onChange={e =>
                                updateTaskPomodoros(
                                  task.id,
                                  parseInt(e.target.value) || 1
                                )
                              }
                              className='w-8 bg-transparent text-center border-none outline-none text-slate-400 hover:text-white focus:text-white'
                            />
                            <span>🍅</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => deleteTask(task.id)}
                        className='text-red-400 hover:text-red-300 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-500/10'
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4'>
          <div
            className={`${currentTheme.card} rounded-3xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto border`}
          >
            <div className='flex items-center justify-between mb-6'>
              <h2 className='text-2xl font-bold text-white'>Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className='text-slate-400 hover:text-white p-2 rounded-lg transition-colors'
              >
                <X size={24} />
              </button>
            </div>

            <div className='space-y-6'>
              {/* Timer Settings */}
              <div>
                <h3 className='text-lg font-semibold text-white mb-4 flex items-center gap-2'>
                  <Clock size={20} />
                  Timer Duration
                </h3>
                <div className='space-y-4'>
                  <div>
                    <label className='block text-sm text-slate-300 mb-2'>
                      Work Session (minutes)
                    </label>
                    <input
                      type='number'
                      min='1'
                      max='90'
                      value={settings.workDuration}
                      onChange={e =>
                        setSettings(prev => ({
                          ...prev,
                          workDuration: parseInt(e.target.value) || 25,
                        }))
                      }
                      className='w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white'
                    />
                  </div>
                  <div>
                    <label className='block text-sm text-slate-300 mb-2'>
                      Short Break (minutes)
                    </label>
                    <input
                      type='number'
                      min='1'
                      max='30'
                      value={settings.shortBreakDuration}
                      onChange={e =>
                        setSettings(prev => ({
                          ...prev,
                          shortBreakDuration: parseInt(e.target.value) || 5,
                        }))
                      }
                      className='w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white'
                    />
                  </div>
                  <div>
                    <label className='block text-sm text-slate-300 mb-2'>
                      Long Break (minutes)
                    </label>
                    <input
                      type='number'
                      min='1'
                      max='60'
                      value={settings.longBreakDuration}
                      onChange={e =>
                        setSettings(prev => ({
                          ...prev,
                          longBreakDuration: parseInt(e.target.value) || 15,
                        }))
                      }
                      className='w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white'
                    />
                  </div>
                  <div>
                    <label className='block text-sm text-slate-300 mb-2'>
                      Long Break Interval
                    </label>
                    <input
                      type='number'
                      min='2'
                      max='10'
                      value={settings.longBreakInterval}
                      onChange={e =>
                        setSettings(prev => ({
                          ...prev,
                          longBreakInterval: parseInt(e.target.value) || 4,
                        }))
                      }
                      className='w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white'
                    />
                  </div>
                </div>
              </div>

              {/* Automation */}
              <div>
                <h3 className='text-lg font-semibold text-white mb-4'>
                  Automation
                </h3>
                <div className='space-y-3'>
                  <label className='flex items-center gap-3'>
                    <input
                      type='checkbox'
                      checked={settings.autoStartBreaks}
                      onChange={e =>
                        setSettings(prev => ({
                          ...prev,
                          autoStartBreaks: e.target.checked,
                        }))
                      }
                      className='w-5 h-5 rounded border-white/20 bg-white/10 text-purple-500 focus:ring-purple-500'
                    />
                    <span className='text-white'>Auto-start breaks</span>
                  </label>
                  <label className='flex items-center gap-3'>
                    <input
                      type='checkbox'
                      checked={settings.autoStartWork}
                      onChange={e =>
                        setSettings(prev => ({
                          ...prev,
                          autoStartWork: e.target.checked,
                        }))
                      }
                      className='w-5 h-5 rounded border-white/20 bg-white/10 text-purple-500 focus:ring-purple-500'
                    />
                    <span className='text-white'>Auto-start work sessions</span>
                  </label>
                  <label className='flex items-center gap-3'>
                    <input
                      type='checkbox'
                      checked={settings.notifications}
                      onChange={e =>
                        setSettings(prev => ({
                          ...prev,
                          notifications: e.target.checked,
                        }))
                      }
                      className='w-5 h-5 rounded border-white/20 bg-white/10 text-purple-500 focus:ring-purple-500'
                    />
                    <span className='text-white'>
                      Enable desktop notifications
                    </span>
                  </label>
                </div>
              </div>

              {/* Sound Settings */}
              <div>
                <h3 className='text-lg font-semibold text-white mb-4 flex items-center gap-2'>
                  <Volume2 size={20} />
                  Sound
                </h3>
                <div>
                  <label className='block text-sm text-slate-300 mb-2'>
                    Notification Volume
                  </label>
                  <input
                    type='range'
                    min='0'
                    max='1'
                    step='0.1'
                    value={settings.soundVolume}
                    onChange={e =>
                      setSettings(prev => ({
                        ...prev,
                        soundVolume: parseFloat(e.target.value),
                      }))
                    }
                    className='w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer'
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats and Themes Modal */}
      {showStats && (
        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4'>
          <div
            className={`${currentTheme.card} rounded-3xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto border`}
          >
            <div className='flex items-center justify-between mb-6'>
              <h2 className='text-2xl font-bold text-white'>Stats & Themes</h2>
              <button
                onClick={() => setShowStats(false)}
                className='text-slate-400 hover:text-white p-2 rounded-lg transition-colors'
              >
                <X size={24} />
              </button>
            </div>
            <div className='space-y-6'>
              {/* Statistics */}
              <div>
                <h3 className='text-lg font-semibold text-white mb-4 flex items-center gap-2'>
                  <BarChart2 size={20} />
                  Your Progress
                </h3>
                <div className='grid grid-cols-2 gap-4 text-center'>
                  <div className='bg-white/10 p-4 rounded-xl'>
                    <div className='text-3xl font-bold text-white'>
                      {sessionCount.total}
                    </div>
                    <div className='text-sm text-slate-400'>
                      Total Pomodoros
                    </div>
                  </div>
                  <div className='bg-white/10 p-4 rounded-xl'>
                    <div className='text-3xl font-bold text-white'>
                      {tasks.filter(t => t.completed).length}
                    </div>
                    <div className='text-sm text-slate-400'>
                      Tasks Completed
                    </div>
                  </div>
                </div>
              </div>

              {/* Theme Selection */}
              <div>
                <h3 className='text-lg font-semibold text-white mb-4 flex items-center gap-2'>
                  <Palette size={20} />
                  Themes
                </h3>
                <div className='flex flex-wrap gap-3'>
                  {Object.entries(themes).map(([key, { accent }]) => (
                    <button
                      key={key}
                      onClick={() => setTheme(key)}
                      className={`p-1.5 rounded-full ring-2 transition-all duration-200 ${
                        theme === key
                          ? 'ring-purple-500'
                          : 'ring-transparent hover:ring-white/20'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full bg-gradient-to-br ${accent}`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PomodoroTimer;

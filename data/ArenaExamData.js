export const REAL_ARENA_EXAM = {
  exam_id: "exam_002_omega",
  title: "Tactical React Native Mastery II",
  total_questions: 8,
  base_score_per_question: 10,
  passing_score: 50,
  currency: "XP",
  questions: [
    // 1. Image Question + MCQ
    {
      id: "q1",
      type: "MCQ",
      text: "Identify the logo shown in the tactical feed.",
      image: "https://wlghgzsgsefvwtdysqsw.supabase.co/storage/v1/object/public/announcements/unnamed%20(1).jpg",
      options: [
        { id: "opt1", text: "Vue.js" },
        { id: "opt2", text: "React Native" },
        { id: "opt3", text: "Angular" }
      ],
      correct_answer: "opt2",
      explanation: "The atom symbol is the signature of the React ecosystem.",
      points: 10
    },
    // 2. MCM (Multiple Choice Multiple Answer)
    {
      id: "q2",
      type: "MCM",
      text: "Select ALL core components in React Native.",
      options: [
        { id: "opt1", text: "View" },
        { id: "opt2", text: "Div" },
        { id: "opt3", text: "Text" },
        { id: "opt4", text: "Span" }
      ],
      correct_answer: ["opt1", "opt3"], // مصفوفة للإجابات الصحيحة
      explanation: "'Div' and 'Span' are HTML tags. React Native uses 'View' and 'Text'.",
      points: 15
    },
    // 3. Yes/No (Image variant)
    {
      id: "q3",
      type: "YES_NO",
      text: "Does 'Expo Go' support native modules editing?",
      image: "https://wlghgzsgsefvwtdysqsw.supabase.co/storage/v1/object/public/announcements/unnamed%20(1).jpg",
      correct_answer: "NO",
      explanation: "Expo Go cannot run custom native code. You need a Development Build for that.",
      points: 5
    },
    // 4. Ordering / Sequencing
    {
      id: "q4",
      type: "ORDERING",
      text: "Arrange the React Native lifecycle methods/hooks in order of execution.",
      items: [
        { id: "i1", text: "Render (Return UI)" },
        { id: "i2", text: "Constructor / Initialization" },
        { id: "i3", text: "useEffect (DidMount)" }
      ],
      correct_order: ["i2", "i1", "i3"],
      explanation: "Initialization happens first, then the initial Render, and finally Side Effects.",
      points: 20
    },
    // 5. Fill in the Blanks
    {
      id: "q5",
      type: "FILL_BLANKS",
      text: "Complete the code snippet.",
      // النص يحتوي على {0}، {1} كأماكن للفراغات
      sentence: "const [state, {0}] = {1}(0);",
      words: [
        { id: "w1", text: "setState" },
        { id: "w2", text: "useEffect" },
        { id: "w3", text: "useState" },
        { id: "w4", text: "var" }
      ],
      correct_answer: ["w1", "w3"], // الترتيب مهم: الفراغ الأول ثم الثاني
      explanation: "Syntax: const [state, setState] = useState(initialValue).",
      points: 15
    },
    // 6. Matching (Existing but improved)
    {
      id: "q6",
      type: "MATCHING",
      text: "Link the style property to its effect.",
      left_items: [
        { id: "l1", text: "flex: 1" },
        { id: "l2", text: "padding" }
      ],
      right_items: [
        { id: "r1", text: "Inner Spacing" },
        { id: "r2", text: "Fill Space" }
      ],
      correct_matches: { "l1": "r2", "l2": "r1" },
      explanation: "Flex controls expansion, Padding controls inner spacing.",
      points: 10
    },
    // 7. True/False (Classic)
    {
      id: "q7",
      type: "TRUE_FALSE",
      text: "React Native uses a bridge to communicate with Native modules.",
      correct_answer: "TRUE",
      explanation: "Historically yes, though the New Architecture (Bridgeless) is changing this.",
      points: 5
    }
  ]
};
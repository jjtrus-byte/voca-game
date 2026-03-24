import { useState, useRef, useEffect } from 'react'
import { createWorker } from 'tesseract.js'

export default function Home() {
  const [words, setWords] = useState([])
  const [currentWord, setCurrentWord] = useState('')
  const [currentMeaning, setCurrentMeaning] = useState('')
  const [quizMode, setQuizMode] = useState(false)
  const [quizWords, setQuizWords] = useState([])
  const [currentQuiz, setCurrentQuiz] = useState(0)
  const [score, setScore] = useState(0)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const workerRef = useRef(null)

  useEffect(() => {
    // localStorage에서 단어 로드
    const savedWords = localStorage.getItem('words')
    if (savedWords) {
      setWords(JSON.parse(savedWords))
    }
    // Tesseract worker 초기화
    const initWorker = async () => {
      const worker = createWorker()
      await worker.load()
      await worker.loadLanguage('eng+kor')
      await worker.initialize('eng+kor')
      workerRef.current = worker
    }
    initWorker()
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
      }
    }
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      videoRef.current.srcObject = stream
    } catch (err) {
      console.error('카메라 접근 실패:', err)
    }
  }

  const capturePhoto = () => {
    const canvas = canvasRef.current
    const video = videoRef.current
    const context = canvas.getContext('2d')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0)
    return canvas.toDataURL('image/png')
  }

  const processImage = async () => {
    const imageData = capturePhoto()
    if (workerRef.current) {
      const { data: { text } } = await workerRef.current.recognize(imageData)
      // 텍스트 파싱: 영어 단어 - 한글 뜻
      const lines = text.split('\n').filter(line => line.trim())
      if (lines.length >= 2) {
        setCurrentWord(lines[0].trim())
        setCurrentMeaning(lines[1].trim())
      }
    }
  }

  const saveWord = () => {
    if (currentWord && currentMeaning) {
      const newWords = [...words, { word: currentWord, meaning: currentMeaning }]
      setWords(newWords)
      localStorage.setItem('words', JSON.stringify(newWords))
      setCurrentWord('')
      setCurrentMeaning('')
    }
  }

  const startQuiz = () => {
    if (words.length > 0) {
      setQuizWords([...words].sort(() => Math.random() - 0.5))
      setQuizMode(true)
      setCurrentQuiz(0)
      setScore(0)
    }
  }

  const checkAnswer = (answer) => {
    if (answer === quizWords[currentQuiz].meaning) {
      setScore(score + 1)
    }
    if (currentQuiz < quizWords.length - 1) {
      setCurrentQuiz(currentQuiz + 1)
    } else {
      setQuizMode(false)
      alert(`퀴즈 종료! 점수: ${score + (answer === quizWords[currentQuiz].meaning ? 1 : 0)} / ${quizWords.length}`)
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>영어-한글 단어 맞추기 게임</h1>
      {!quizMode ? (
        <div>
          <h2>단어 등록</h2>
          <button onClick={startCamera}>카메라 시작</button>
          <video ref={videoRef} autoPlay style={{ width: '300px' }}></video>
          <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
          <button onClick={processImage}>사진 촬영 및 OCR</button>
          <input
            type="text"
            placeholder="영어 단어"
            value={currentWord}
            onChange={(e) => setCurrentWord(e.target.value)}
          />
          <input
            type="text"
            placeholder="한글 뜻"
            value={currentMeaning}
            onChange={(e) => setCurrentMeaning(e.target.value)}
          />
          <button onClick={saveWord}>단어 저장</button>
          <h2>등록된 단어들</h2>
          <ul>
            {words.map((w, i) => <li key={i}>{w.word} - {w.meaning}</li>)}
          </ul>
          <button onClick={startQuiz}>퀴즈 시작</button>
        </div>
      ) : (
        <div>
          <h2>퀴즈</h2>
          <p>영어 단어: {quizWords[currentQuiz].word}</p>
          <p>한글 뜻을 입력하세요:</p>
          <input
            type="text"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                checkAnswer(e.target.value)
                e.target.value = ''
              }
            }}
          />
          <p>점수: {score}</p>
        </div>
      )}
    </div>
  )
}
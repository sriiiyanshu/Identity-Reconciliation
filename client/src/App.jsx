import { useState } from 'react'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

function App() {
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [response, setResponse] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setResponse(null)

    const payload = {
      email: email.trim() || null,
      phoneNumber: phoneNumber.trim() || null
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/identify`, payload)
      setResponse(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page">
      <section className="card">
        <h1>Identity Reconciliation</h1>
        <form onSubmit={handleSubmit} className="form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="mcfly@hillvalley.edu"
            />
          </label>

          <label>
            Phone Number
            <input
              type="text"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="123456"
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? 'Checking...' : 'Identify'}
          </button>
        </form>

        {error ? <p className="error">{error}</p> : null}

        {response ? <pre>{JSON.stringify(response, null, 2)}</pre> : null}
      </section>
    </main>
  )
}

export default App

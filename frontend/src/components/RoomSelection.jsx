export function RoomSelection({ setUsername, setRoomId }) {

  const createRoom = () => {
    const username = document.getElementById('username').value.trim()
    if (!username) {
      alert('Please enter a username')
      return
    }
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    setUsername(username)
    setRoomId(roomId)
    window.history.pushState({}, '', `?username=${username}&roomId=${roomId}&host=true&hostUser=${username}`)
  }

  const joinRoom = () => {
    const username = document.getElementById('username').value.trim()
    const roomId = document.getElementById('roomId').value.trim().toUpperCase()
    if (!username || !roomId) {
      alert('Please enter both username and room code')
      return
    }
    setUsername(username)
    setRoomId(roomId)
    window.history.pushState({}, '', `?username=${username}&roomId=${roomId}`)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const roomId = document.getElementById('roomId').value.trim()
      roomId ? joinRoom() : createRoom()
    }
  }

  return (
    <main
      className="h-screen w-full flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
      }}
    >
      {/* Ambient glow effects */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }}
      />
      <div
        className="fixed bottom-0 right-1/4 w-64 h-64 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }}
      />

      <div className="w-full max-w-md relative z-10">

        {/* Logo */}
        <div className="text-center mb-8 bo ">
          <img
            src="/MergePad_logo.png"
            alt="MergePad Logo"
            className="w-72 mx-auto"
          />
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 shadow-2xl border"
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            borderColor: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Username */}
          <div className="mb-5">
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'rgba(255,255,255,0.4)' }}>
              Your Name
            </label>
            <input
              id="username"
              placeholder="e.g. Shwet"
              onKeyDown={handleKeyDown}
              className="w-full text-white placeholder-gray-600 px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.6)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          {/* Create Room */}
          <button
            onClick={createRoom}
            className="w-full text-white font-semibold py-3 rounded-xl text-sm mb-5 transition-opacity hover:opacity-90"
            style={{
              background: 'linear-gradient(90deg, #2563eb 0%, #7c3aed 100%)',
            }}
          >
            + Create New Room
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>or join existing</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Room Code + Join */}
          <div className="flex gap-2">
            <input
              id="roomId"
              placeholder="ROOM CODE"
              onKeyDown={handleKeyDown}
              defaultValue={new URLSearchParams(window.location.search).get('roomId') || ''}
              className="flex-1 text-white placeholder-gray-600 px-4 py-3 rounded-xl text-sm font-mono tracking-widest uppercase focus:outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(34,197,94,0.6)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
            <button
              onClick={joinRoom}
              className="text-white font-semibold px-6 py-3 rounded-xl text-sm transition-opacity hover:opacity-90"
              style={{
                background: 'linear-gradient(90deg, #059669 0%, #0891b2 100%)',
              }}
            >
              Join
            </button>
          </div>

        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Share the room code with collaborators to code together
        </p>

      </div>
    </main>
  )
}
/* ============================================
   app.js - 자동로그인 페이지 로직
   ============================================ */

const STORAGE_KEY = 'autoLoginRows'

const allCompanies = [
  '보육나라', '장부나라', '키즈홈', '인천시어린이집관리시스템',
  '경기도어린이집관리시스템', '대전시어린이집관리시스템',
  '충청남도어린이집관리시스템(하나은행)', '프라임전자장부', '키득키즈',
  '서울시어린이집관리시스템', '이편한시스템', '더편한시스템', '와이즈안',
  '키드키즈', '부산시어린이집관리시스템', '광주시어린이집관리시스템',
]

let rows = []
let certModalIdx = null
let testingIdx = null

// ─── 초기화 ───
document.addEventListener('DOMContentLoaded', () => {
  loadRows()
  populateCompanySelect()
  renderTable()

  document.getElementById('btnAdd').addEventListener('click', handleAdd)
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeCertModal()
  })
  document.getElementById('btnCertRegister').addEventListener('click', handleCertRegister)
  document.getElementById('btnCertReset').addEventListener('click', handleCertReset)
  document.getElementById('btnCertClose').addEventListener('click', closeCertModal)
})

// ─── 데이터 관리 ───
function loadRows() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    rows = stored ? JSON.parse(stored) : []
  } catch { rows = [] }
}

function saveRows() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
}

function makeRow(label) {
  return { label, facilityName: '', authType: 'id+pw', id: '', pw: '', certFile: '', certPw: '', lastLogin: '' }
}

function getNow() {
  const d = new Date()
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

// ─── 업체 선택 셀렉트 ───
function populateCompanySelect() {
  const sel = document.getElementById('companySelect')
  allCompanies.forEach(c => {
    const opt = document.createElement('option')
    opt.value = c
    opt.textContent = c
    sel.appendChild(opt)
  })
}

// ─── 업체 추가 ───
function handleAdd() {
  const sel = document.getElementById('companySelect')
  if (!sel.value) { alert('업체를 선택해주세요.'); return }
  rows.push(makeRow(sel.value))
  saveRows()
  sel.value = ''
  renderTable()
}

// ─── 테이블 렌더링 ───
function renderTable() {
  const tbody = document.getElementById('tableBody')
  tbody.innerHTML = ''

  rows.forEach((row, idx) => {
    const tr = document.createElement('tr')
    tr.className = 'tr'

    const isIdPw = row.authType === 'id+pw'
    const isCert = row.authType === 'cert'
    const disabledCls = 'input-text--disabled'

    tr.innerHTML = `
      <td class="td td-text-num">${idx + 1}</td>
      <td class="td td--left td-text-label">${row.label}</td>
      <td class="td-input">
        <input type="text" class="input-text" value="${esc(row.facilityName)}" placeholder="시설명 입력"
          data-idx="${idx}" data-field="facilityName" onchange="onFieldChange(this)">
      </td>
      <td class="td-input" style="text-align:center">
        <select class="select-box select-box--small" data-idx="${idx}" data-field="authType" onchange="onAuthTypeChange(this)">
          <option value="id+pw" ${isIdPw ? 'selected' : ''}>id+pw</option>
          <option value="cert" ${isCert ? 'selected' : ''}>공인인증서</option>
        </select>
      </td>
      <td class="td-input ${isCert ? 'td--disabled' : ''}">
        <input type="text" class="input-text ${isCert ? disabledCls : ''}" value="${esc(row.id)}"
          ${isCert ? 'disabled' : ''} data-idx="${idx}" data-field="id" onchange="onFieldChange(this)">
      </td>
      <td class="td-input ${isCert ? 'td--disabled' : ''}">
        <input type="password" class="input-password ${isCert ? 'input-password--disabled' : ''}" value="${esc(row.pw)}"
          ${isCert ? 'disabled' : ''} data-idx="${idx}" data-field="pw" onchange="onFieldChange(this)">
      </td>
      <td class="td ${isCert ? '' : 'td--disabled'}" style="text-align:center">
        ${isCert
          ? `<button class="btn btn--sm btn-cert" onclick="openCertModal(${idx})">${row.certFile ? '&#10004; 등록됨' : '선택...'}</button>`
          : '<span class="td-text-muted">-</span>'}
      </td>
      <td class="td">
        <div class="btn-group">
          <button class="btn btn--sm btn-save" onclick="handleSaveToServer(${idx})">저장</button>
          <button class="btn btn--sm btn-reset" onclick="handleClearRow(${idx})">초기화</button>
          <button class="btn btn--sm btn-delete" onclick="handleDeleteRow(${idx})">삭제</button>
        </div>
      </td>
      <td class="td">
        ${row.id || row.certFile
          ? `<button class="btn btn--sm ${testingIdx === idx ? 'btn-verify--loading' : 'btn-verify'}" onclick="handleTest(${idx})" ${testingIdx === idx ? 'disabled' : ''}>
              ${testingIdx === idx ? '검증중...' : '실행'}
            </button>`
          : '<span class="td-text-muted">-</span>'}
      </td>
      <td class="td td-text-date">${row.lastLogin || '-'}</td>
      <td class="td">
        ${row.id || row.certFile
          ? '<button class="btn btn--sm btn-login">로그인</button>'
          : '<span class="td-text-muted">-</span>'}
      </td>
      <td class="td"><span class="td-text-muted">-</span></td>
      <td class="td"><span class="td-text-muted">-</span></td>
      <td class="td"><span class="td-text-muted">-</span></td>
      <td class="td td--last"><span class="td-text-muted">-</span></td>
    `
    tbody.appendChild(tr)
  })
}

// ─── 필드 변경 핸들러 ───
function onFieldChange(el) {
  const idx = parseInt(el.dataset.idx)
  const field = el.dataset.field
  rows[idx][field] = el.value
}

function onAuthTypeChange(el) {
  const idx = parseInt(el.dataset.idx)
  rows[idx].authType = el.value
  renderTable()
}

// ─── 저장/삭제/초기화 ───
function handleSave(idx) {
  rows[idx].lastLogin = getNow()
  saveRows()
  renderTable()
  alert(`${rows[idx].label} 저장 완료`)
}

async function handleSaveToServer(idx) {
  const row = rows[idx]
  try {
    const res = await fetch('/api/auto-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company: row.label,
        authType: row.authType === 'id+pw' ? 'idpw' : 'cert',
        id: row.id,
        pw: row.pw,
        certName: row.certFile,
        certPw: row.certPw,
      }),
    })
    const data = await res.json()
    if (data.success) {
      handleSave(idx)
    } else {
      alert(data.message || '저장 실패')
    }
  } catch {
    // 로컬 저장으로 폴백
    handleSave(idx)
  }
}

function handleClearRow(idx) {
  rows[idx] = { ...rows[idx], id: '', pw: '', certFile: '', certPw: '', lastLogin: '' }
  saveRows()
  renderTable()
}

function handleDeleteRow(idx) {
  if (!confirm(`"${rows[idx].label}" 업체를 삭제하시겠습니까?`)) return
  rows.splice(idx, 1)
  saveRows()
  renderTable()
}

// ─── 검증 ───
async function handleTest(idx) {
  const row = rows[idx]
  if (row.authType === 'id+pw' && (!row.id || !row.pw)) { alert('아이디와 비밀번호를 입력해주세요.'); return }
  if (row.authType === 'cert' && (!row.certFile || !row.certPw)) { alert('인증서를 등록해주세요.'); return }

  testingIdx = idx
  renderTable()

  try {
    const res = await fetch('/api/auto-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company: row.label,
        authType: row.authType === 'id+pw' ? 'idpw' : 'cert',
        id: row.id, pw: row.pw,
        certName: row.certFile, certPw: row.certPw,
        action: 'verify',
      }),
    })
    const data = await res.json()
    if (data.success) {
      rows[idx].lastLogin = getNow()
      saveRows()
      alert(`${row.label} 로그인 성공!`)
    } else {
      alert(data.error || data.message || '로그인 실패')
    }
  } catch {
    alert('통합e 서버에 연결할 수 없습니다.')
  } finally {
    testingIdx = null
    renderTable()
  }
}

// ─── 인증서 모달 ───
function openCertModal(idx) {
  certModalIdx = idx
  const overlay = document.getElementById('modalOverlay')
  overlay.classList.remove('modal-overlay--hidden')
  document.getElementById('modalCompanyLabel').textContent = rows[idx].label

  const certList = document.getElementById('certList')
  if (rows[idx].certFile) {
    certList.innerHTML = `<div class="cert-list-item"><span class="cert-list-item-check">&#10004;</span><span class="cert-list-item-name">${esc(rows[idx].certFile)}</span></div>`
  } else {
    certList.innerHTML = '<div class="cert-list-empty">등록된 인증서가 없습니다</div>'
  }

  document.getElementById('certPassword').value = rows[idx].certPw || ''
}

function closeCertModal() {
  certModalIdx = null
  document.getElementById('modalOverlay').classList.add('modal-overlay--hidden')
}

function handleCertRegister() {
  if (certModalIdx === null) return
  if (!rows[certModalIdx].certFile) { alert('인증서를 선택해주세요.'); return }
  const pw = document.getElementById('certPassword').value
  if (!pw) { alert('인증서 비밀번호를 입력해주세요.'); return }
  rows[certModalIdx].certPw = pw
  saveRows()
  closeCertModal()
  renderTable()
  alert('인증서가 등록되었습니다.')
}

function handleCertReset() {
  if (certModalIdx === null) return
  rows[certModalIdx].certFile = ''
  rows[certModalIdx].certPw = ''
  saveRows()
  openCertModal(certModalIdx) // 갱신
  renderTable()
}

// 인증서 파일 선택
document.addEventListener('change', (e) => {
  if (e.target.id === 'certFileInput') {
    const file = e.target.files[0]
    if (file && certModalIdx !== null) {
      rows[certModalIdx].certFile = file.name
      saveRows()
      openCertModal(certModalIdx) // 갱신
    }
  }
})

// ─── 유틸 ───
function esc(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

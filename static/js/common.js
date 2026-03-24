/* ==========================================================================
   common.js - Shared layout initializer for all pages
   ========================================================================== */

const MENU_CONFIG = {
  accounting: {
    label: '회계',
    icon: '&#128200;',
    gnb: [
      {
        label: '전표관리',
        sub: [
          { label: '수입전표', href: 'voucher/income.html' },
          { label: '지출전표', href: 'voucher/expense.html' },
          { label: '계좌내역', href: 'voucher/bank.html' },
        ],
      },
      {
        label: '장부',
        sub: [
          { label: '현금장부', href: 'cash-ledger.html' },
          { label: '월회계보고', href: 'monthly-report.html' },
        ],
      },
      {
        label: '결산',
        sub: [
          { label: '월별결산서', href: 'settlement/monthly.html' },
          { label: '연말결산서', href: 'settlement/annual.html' },
        ],
      },
      {
        label: '정산',
        sub: [
          { label: '정부보조금명세서', href: 'reconciliation/subsidy.html' },
          { label: '보조금정산서', href: 'reconciliation/settlement.html' },
          { label: '누리과정정산서', href: 'reconciliation/nuri.html' },
          { label: '급식비정산서', href: 'reconciliation/meal.html' },
          { label: '필요경비정산서', href: 'reconciliation/required-expense.html' },
          { label: '특별활동비보고서', href: 'reconciliation/activity.html' },
          { label: '기타필요경비보고서', href: 'reconciliation/expense.html' },
        ],
      },
      {
        label: '예산',
        sub: [
          { label: '세입예산', href: 'budget/income.html' },
          { label: '세출예산', href: 'budget/expense.html' },
        ],
      },
    ],
  },
  settings: {
    label: '설정',
    icon: '&#9881;',
    gnb: [
      {
        label: '설정',
        sub: [
          { label: '환경설정', href: 'settings.html' },
          { label: '데이터이관', href: 'data-migration/index.html' },
          { label: '자동로그인', href: 'auto-login/index.html' },
        ],
      },
    ],
  },
  staff: {
    label: '교직원',
    icon: '&#128101;',
    gnb: [{ label: '교직원관리', sub: [{ label: '교직원관리', href: 'staff.html' }] }],
  },
  children: {
    label: '원아',
    icon: '&#128118;',
    gnb: [{ label: '원아관리', sub: [{ label: '원아관리', href: 'children.html' }] }],
  },
  community: {
    label: '커뮤니티',
    icon: '&#127760;',
    gnb: [
      {
        label: '계산기',
        sub: [{ label: '급식비계산기', href: 'community/calculator/meal.html' }],
      },
    ],
  },
};

function initApp(opts) {
  var bp = typeof basePath !== 'undefined' ? basePath : '';
  renderHeader(bp, opts);
  renderSidebar(bp, opts);
}

function renderHeader(bp, opts) {
  var el = document.getElementById('header');
  if (!el) return;
  var cat = MENU_CONFIG[opts.categoryKey] || {};
  var gnb = cat.gnb || [];
  var activeGnb = gnb.find(function(g){return g.label===opts.menuLabel}) || gnb[0] || {label:'',sub:[]};

  var band1Cats = '';
  for (var key in MENU_CONFIG) {
    var c = MENU_CONFIG[key];
    var active = key === opts.categoryKey;
    var firstHref = key === 'accounting' ? 'voucher/income.html' : (c.gnb[0] && c.gnb[0].sub[0] ? c.gnb[0].sub[0].href : '#');
    band1Cats += '<a href="'+bp+firstHref+'" class="category-item '+(active?'category-item--active':'')+'">'
      + '<span class="category-icon '+(active?'category-icon--active':'')+'">'+c.icon+'</span>'
      + '<span class="category-label">'+c.label+'</span></a>';
  }

  var band2Items = '';
  for (var i=0;i<gnb.length;i++) {
    var g = gnb[i];
    var act = g.label === activeGnb.label;
    var href = g.sub[0] ? bp+g.sub[0].href : '#';
    band2Items += '<a href="'+href+'" class="gnb-item '+(act?'gnb-item--active':'')+'">'+g.label+'</a>';
  }

  var band3Items = '';
  for (var j=0;j<activeGnb.sub.length;j++) {
    var s = activeGnb.sub[j];
    var sa = s.href === opts.subMenuHref;
    band3Items += '<a href="'+bp+s.href+'" class="sub-tab-item '+(sa?'sub-tab-item--active':'')+'">'+s.label+'</a>';
  }

  el.innerHTML = '<div class="header-band1">'
    + '<div class="logo">키드키즈 <span class="logo-sub">회계</span></div>'
    + '<nav class="category-nav">'+band1Cats+'</nav>'
    + '<div class="user-area">'
    + '<span class="timer">29:58</span>'
    + '<button class="center-name-btn">햇살어린이집 &#9662;</button>'
    + '<button class="logout-btn">로그아웃</button>'
    + '</div></div>'
    + '<div class="header-band2">'+band2Items+'</div>'
    + (band3Items ? '<div class="header-band3"><div class="sub-tab-bar">'+band3Items+'</div><span class="contact-info">고객센터 1544-0000</span></div>' : '');
}

function renderSidebar(bp, opts) {
  var el = document.getElementById('sidebar');
  if (!el) return;
  var cat = MENU_CONFIG[opts.categoryKey] || {};
  var gnb = cat.gnb || [];

  var html = '<div class="sidebar"><div class="sidebar-title">'+(cat.label||'')+'</div>';
  for (var i=0;i<gnb.length;i++) {
    var g = gnb[i];
    var isOpen = g.label === opts.menuLabel;
    html += '<div class="sidebar-menu-item '+(isOpen?'sidebar-menu-item--open':'')+'" onclick="this.classList.toggle(\'sidebar-menu-item--open\');this.nextElementSibling.classList.toggle(\'is-open\')">'
      + '<span>'+g.label+'</span><span class="chevron '+(isOpen?'chevron--open':'')+'">&#9656;</span></div>'
      + '<div class="sidebar-submenu '+(isOpen?'is-open':'')+'">';
    for (var j=0;j<g.sub.length;j++) {
      var s = g.sub[j];
      var active = s.href === opts.subMenuHref;
      html += '<a href="'+bp+s.href+'" class="sidebar-submenu-item '+(active?'sidebar-submenu-item--active':'')+'">'+s.label+'</a>';
    }
    html += '</div>';
  }
  html += '<div class="sidebar-footer"><div class="sidebar-center-card"><strong>햇살어린이집</strong>서울특별시 강남구<br>설립유형: 민간<br>정원: 40명</div></div></div>';
  el.innerHTML = html;
}

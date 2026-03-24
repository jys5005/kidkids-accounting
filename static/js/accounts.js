/**
 * accounts.js - Account data and helper functions
 * Korean childcare accounting system (vanilla JS)
 */

/* ========================================================================
   Income Accounts
   ======================================================================== */

var incomeAccounts = [
  { value: '보조금수입', label: '보조금수입' },
  { value: '기관보육료', label: '기관보육료', isSub: true },
  { value: '기본보육료', label: '기본보육료', isSub: true },
  { value: '누리과정보육료', label: '누리과정보육료', isSub: true },
  { value: '연장보육료', label: '연장보육료', isSub: true },
  { value: '야간보육료', label: '야간보육료', isSub: true },
  { value: '24시간보육료', label: '24시간보육료', isSub: true },
  { value: '장애아보육료', label: '장애아보육료', isSub: true },
  { value: '방과후보육료', label: '방과후보육료', isSub: true },
  { value: '차량운영비', label: '차량운영비', isSub: true },
  { value: '인건비보조금', label: '인건비보조금', isSub: true },
  { value: '기타보조금수입', label: '기타보조금수입', isSub: true },
  { value: '부모부담수입', label: '부모부담수입' },
  { value: '보육료수입', label: '보육료수입', isSub: true },
  { value: '특별활동비', label: '특별활동비', isSub: true },
  { value: '기타필요경비', label: '기타필요경비', isSub: true },
  { value: '입학준비금', label: '입학준비금', isSub: true },
  { value: '현장학습비', label: '현장학습비', isSub: true },
  { value: '차량비', label: '차량비', isSub: true },
  { value: '행사비', label: '행사비', isSub: true },
  { value: '아침저녁급식비', label: '아침저녁급식비', isSub: true },
  { value: '기타수입', label: '기타수입' },
  { value: '이자수입', label: '이자수입', isSub: true },
  { value: '잡수입', label: '잡수입', isSub: true },
  { value: '전입금', label: '전입금', isSub: true },
  { value: '이월금', label: '이월금' },
  { value: '전년도이월금', label: '전년도이월금', isSub: true },
];


/* ========================================================================
   Expense Accounts
   ======================================================================== */

var expenseAccounts = [
  { value: '인건비', label: '인건비' },
  { value: '원장인건비', label: '원장인건비', isSub: true },
  { value: '보육교사인건비', label: '보육교사인건비', isSub: true },
  { value: '기타직원인건비', label: '기타직원인건비', isSub: true },
  { value: '퇴직금', label: '퇴직금', isSub: true },
  { value: '4대보험부담금', label: '4대보험부담금', isSub: true },
  { value: '관리운영비', label: '관리운영비' },
  { value: '여비교통비', label: '여비교통비', isSub: true },
  { value: '사무용품비', label: '사무용품비', isSub: true },
  { value: '수용비및수수료', label: '수용비및수수료', isSub: true },
  { value: '시설장비유지비', label: '시설장비유지비', isSub: true },
  { value: '차량비', label: '차량비(지출)', isSub: true },
  { value: '보험료', label: '보험료', isSub: true },
  { value: '업무추진비', label: '업무추진비', isSub: true },
  { value: '건물위생관리비', label: '건물위생관리비', isSub: true },
  { value: '임차료', label: '임차료', isSub: true },
  { value: '잡지출', label: '잡지출', isSub: true },
  { value: '보육활동비', label: '보육활동비' },
  { value: '급식비', label: '급식비', isSub: true },
  { value: '교재교구비', label: '교재교구비', isSub: true },
  { value: '보육교구비', label: '보육교구비', isSub: true },
  { value: '행사비', label: '행사비(지출)', isSub: true },
  { value: '특별활동비', label: '특별활동비(지출)', isSub: true },
];


/* ========================================================================
   Account Code Mappings
   ======================================================================== */

/**
 * 4-digit major account codes (관항목).
 * Income: 4100-series, Expense: 4200-series onward.
 */
var _accountCodes = {
  // Income - major
  '보조금수입':     '4101',
  '부모부담수입':   '4102',
  '기타수입':       '4103',
  '이월금':         '4104',
  // Expense - major
  '인건비':         '4201',
  '관리운영비':     '4202',
  '보육활동비':     '4203',
};

/**
 * 7-digit sub-account codes (세부과목).
 */
var _subAccountCodes = {
  // Income - sub
  '기관보육료':       '4101001',
  '기본보육료':       '4101002',
  '누리과정보육료':   '4101003',
  '연장보육료':       '4101004',
  '야간보육료':       '4101005',
  '24시간보육료':     '4101006',
  '장애아보육료':     '4101007',
  '방과후보육료':     '4101008',
  '차량운영비':       '4101009',
  '인건비보조금':     '4101010',
  '기타보조금수입':   '4101011',
  '보육료수입':       '4102001',
  '특별활동비':       '4102002',
  '기타필요경비':     '4102003',
  '입학준비금':       '4102004',
  '현장학습비':       '4102005',
  '차량비':           '4102006',
  '행사비':           '4102007',
  '아침저녁급식비':   '4102008',
  '이자수입':         '4103001',
  '잡수입':           '4103002',
  '전입금':           '4103003',
  '전년도이월금':     '4104001',
  // Expense - sub
  '원장인건비':       '4201001',
  '보육교사인건비':   '4201002',
  '기타직원인건비':   '4201003',
  '퇴직금':           '4201004',
  '4대보험부담금':    '4201005',
  '여비교통비':       '4202001',
  '사무용품비':       '4202002',
  '수용비및수수료':   '4202003',
  '시설장비유지비':   '4202004',
  '보험료':           '4202006',
  '업무추진비':       '4202007',
  '건물위생관리비':   '4202008',
  '임차료':           '4202009',
  '잡지출':           '4202010',
  '급식비':           '4203001',
  '교재교구비':       '4203002',
  '보육교구비':       '4203003',
};


/* ========================================================================
   External Name Mapping (CIS, bank systems, etc.)
   ======================================================================== */

var _externalNameMap = {
  // Common CIS / external system name variations
  '기관보육료수입':       '기관보육료',
  '기본보육료수입':       '기본보육료',
  '누리과정보육료수입':   '누리과정보육료',
  '연장보육료수입':       '연장보육료',
  '야간보육료수입':       '야간보육료',
  '24시간보육료수입':     '24시간보육료',
  '장애아보육료수입':     '장애아보육료',
  '방과후보육료수입':     '방과후보육료',
  '차량운영비수입':       '차량운영비',
  '인건비보조금수입':     '인건비보조금',
  '특별활동비수입':       '특별활동비',
  '기타필요경비수입':     '기타필요경비',
  '원장인건비지출':       '원장인건비',
  '보육교사인건비지출':   '보육교사인건비',
  '기타직원인건비지출':   '기타직원인건비',
  '퇴직금지출':           '퇴직금',
  '4대보험부담금지출':    '4대보험부담금',
  '급식비지출':           '급식비',
  '교재교구비지출':       '교재교구비',
  '보육교구비지출':       '보육교구비',
  '차량비지출':           '차량비',
  '행사비지출':           '행사비',
  '특별활동비지출':       '특별활동비',
};


/* ========================================================================
   Helper Functions
   ======================================================================== */

/**
 * Check if an account name is an income type.
 * @param {string} name - Account name (value field)
 * @returns {boolean}
 */
function isIncomeAccount(name) {
  return incomeAccounts.some(function(a) { return a.value === name; });
}

/**
 * Check if an account name is an expense type.
 * @param {string} name - Account name (value field)
 * @returns {boolean}
 */
function isExpenseAccount(name) {
  return expenseAccounts.some(function(a) { return a.value === name; });
}

/**
 * Get the 4-digit major account code for a given account name.
 * For sub-accounts, returns the parent's 4-digit code (first 4 digits of the 7-digit code).
 * @param {string} name - Account name
 * @returns {string|null} 4-digit code or null if not found
 */
function getAccountCode(name) {
  if (_accountCodes[name]) {
    return _accountCodes[name];
  }
  // Try sub-account: return first 4 digits
  if (_subAccountCodes[name]) {
    return _subAccountCodes[name].substring(0, 4);
  }
  return null;
}

/**
 * Get the 7-digit sub-account code for a given account name.
 * @param {string} name - Account name
 * @returns {string|null} 7-digit code or null if not found
 */
function getSubAccountCode(name) {
  return _subAccountCodes[name] || null;
}

/**
 * Map an external system account name to the standard internal name.
 * If no mapping exists, returns the original name.
 * @param {string} externalName - Name from CIS, bank, or other external system
 * @returns {string} Standard internal account name
 */
function resolveAccount(externalName) {
  if (!externalName) return '';
  return _externalNameMap[externalName] || externalName;
}

/**
 * Get the display label for a given account value.
 * @param {string} value - Account value
 * @returns {string} Display label
 */
function getAccountLabel(value) {
  var all = incomeAccounts.concat(expenseAccounts);
  var found = all.find(function(a) { return a.value === value; });
  return found ? found.label : value;
}

/**
 * Get all top-level (non-sub) income accounts.
 * @returns {Array}
 */
function getIncomeCategories() {
  return incomeAccounts.filter(function(a) { return !a.isSub; });
}

/**
 * Get all top-level (non-sub) expense accounts.
 * @returns {Array}
 */
function getExpenseCategories() {
  return expenseAccounts.filter(function(a) { return !a.isSub; });
}

/**
 * Get sub-accounts belonging to a parent category.
 * Sub-accounts are defined as consecutive isSub:true entries following a non-sub entry.
 * @param {string} parentValue - The parent account value
 * @param {string} type - 'income' or 'expense'
 * @returns {Array}
 */
function getSubAccounts(parentValue, type) {
  var list = type === 'income' ? incomeAccounts : expenseAccounts;
  var found = false;
  var result = [];
  for (var i = 0; i < list.length; i++) {
    if (!list[i].isSub && list[i].value === parentValue) {
      found = true;
      continue;
    }
    if (found) {
      if (list[i].isSub) {
        result.push(list[i]);
      } else {
        break; // Reached the next parent
      }
    }
  }
  return result;
}

/**
 * Find the parent account for a given sub-account.
 * @param {string} subValue - The sub-account value
 * @returns {Object|null} The parent account object or null
 */
function getParentAccount(subValue) {
  var allLists = [incomeAccounts, expenseAccounts];
  for (var k = 0; k < allLists.length; k++) {
    var list = allLists[k];
    var lastParent = null;
    for (var i = 0; i < list.length; i++) {
      if (!list[i].isSub) {
        lastParent = list[i];
      } else if (list[i].value === subValue) {
        return lastParent;
      }
    }
  }
  return null;
}

/**
 * Build options HTML for a <select> element from an account list.
 * Sub-accounts are indented with a prefix.
 * @param {string} type - 'income', 'expense', or 'all'
 * @param {Object} [options] - { includeEmpty: bool, emptyLabel: string, subOnly: bool }
 * @returns {string} HTML string of <option> elements
 */
function buildAccountOptions(type, options) {
  options = options || {};
  var list;
  if (type === 'all') {
    list = incomeAccounts.concat(expenseAccounts);
  } else if (type === 'expense') {
    list = expenseAccounts;
  } else {
    list = incomeAccounts;
  }

  var html = '';
  if (options.includeEmpty !== false) {
    html += '<option value="">' + (options.emptyLabel || '선택하세요') + '</option>';
  }

  list.forEach(function(acc) {
    if (options.subOnly && !acc.isSub) return;
    var indent = acc.isSub ? '\u00A0\u00A0\u00A0' : '';
    var disabled = !acc.isSub && !options.allowParent ? ' disabled' : '';
    html += '<option value="' + acc.value + '"' + disabled + '>' + indent + acc.label + '</option>';
  });

  return html;
}

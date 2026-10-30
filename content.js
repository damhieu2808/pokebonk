// ==UserScript==
// @name         PokéBonk Modifier (Tiếng Việt)
// @namespace    http://tampermonkey.net/
// @version      1.5.0
// @description  Công cụ tùy chỉnh toàn bộ thông số trong trận PokéBonk
// @author       Antigravity
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  if (window.__POKEBONK_TRAINER_INJECTED__) return;
  window.__POKEBONK_TRAINER_INJECTED__ = true;

  // ==================== 1. Chặn khóa chuột (Pointer Lock) thông minh ====================
  let isPanelOpen = false;

  // Khi bảng điều khiển đang mở, ngăn game tự chiếm lại con trỏ chuột
  const origRequestPointerLock = Element.prototype.requestPointerLock;
  if (origRequestPointerLock) {
    Element.prototype.requestPointerLock = function (...args) {
      if (isPanelOpen) {
        return Promise.reject(new Error('Pointer lock blocked while trainer is active'));
      }
      return origRequestPointerLock.apply(this, args);
    };
  }

  function unlockMouse() {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  // ==================== 2. Cơ chế tự động bắt đối tượng trận đấu (run) ====================
  let capturedRun = null;

  function isValidRun(r) {
    return Boolean(
      r &&
      typeof r === 'object' &&
      r !== window &&
      r.player &&
      typeof r.player === 'object' &&
      r.diff &&
      typeof r.diff === 'object' &&
      typeof r.player.level === 'number'
    );
  }

  function hookAppPrototype(proto) {
    if (!proto || proto.__POKEBONK_HOOKED__) return;
    proto.__POKEBONK_HOOKED__ = true;

    // Hook frameGap: vòng lặp chính của game gọi hàm này ở mỗi khung hình
    if (typeof proto.frameGap === 'function') {
      const origFrameGap = proto.frameGap;
      proto.frameGap = function () {
        if (this.run && isValidRun(this.run)) {
          capturedRun = this.run;
          window.__run = this.run;
        }
        return origFrameGap.apply(this, arguments);
      };
    }

    // Hook startRun (bắt đầu trận)
    if (typeof proto.startRun === 'function') {
      const origStartRun = proto.startRun;
      proto.startRun = function (...args) {
        const res = origStartRun.apply(this, args);
        if (this.run && isValidRun(this.run)) {
          capturedRun = this.run;
          window.__run = this.run;
        }
        return res;
      };
    }

    // Hook toMenu (quay về menu)
    if (typeof proto.toMenu === 'function') {
      const origToMenu = proto.toMenu;
      proto.toMenu = function (...args) {
        capturedRun = null;
        window.__run = null;
        return origToMenu.apply(this, args);
      };
    }
  }

  async function autoHookGame() {
    const urls = new Set();
    if (typeof performance !== 'undefined' && performance.getEntriesByType) {
      for (const entry of performance.getEntriesByType('resource')) {
        if (entry.name && entry.name.includes('/assets/main-') && entry.name.endsWith('.js')) {
          urls.add(entry.name);
        }
      }
    }
    for (const s of document.querySelectorAll('script[src]')) {
      if (s.src && s.src.includes('main-') && s.src.endsWith('.js')) {
        urls.add(s.src);
      }
    }
    for (const url of urls) {
      try {
        const mod = await import(url);
        if (mod && mod.App && mod.App.prototype) {
          hookAppPrototype(mod.App.prototype);
          break;
        }
      } catch (e) {}
    }
  }

  setInterval(() => {
    if (!capturedRun) {
      autoHookGame();
    }
  }, 600);

  function getRun() {
    if (isValidRun(capturedRun)) return capturedRun;
    if (isValidRun(window.__run)) return window.__run;
    if (isValidRun(window.__PB?.run)) return window.__PB.run;
    if (isValidRun(window.temp1)) return window.temp1;
    if (isValidRun(window.run)) return window.run;
    return null;
  }

  // ==================== 3. Giao diện UI đen trắng tối giản ====================
  function initUI() {
    if (document.getElementById('pokebonk-trainer-host')) return;

    const host = document.createElement('div');
    host.id = 'pokebonk-trainer-host';
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      :host {
        --bg-panel: #161616;
        --bg-card: #202020;
        --bg-input: #111111;
        --border-main: #333333;
        --border-light: #444444;
        --text-white: #ffffff;
        --text-light: #d6d6d6;
        --text-muted: #888888;
        --btn-bg: #2a2a2a;
        --btn-hover: #383838;
        --btn-active: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 12px;
        color: var(--text-light);
        z-index: 9999999;
        position: fixed;
      }

      /* Bảng điều khiển đen trắng tối giản */
      .trainer-panel {
        position: fixed;
        top: 50px;
        right: 40px;
        width: 520px;
        max-height: 88vh;
        background: var(--bg-panel);
        border: 1px solid var(--border-main);
        border-radius: 6px;
        box-shadow: 0 16px 36px rgba(0, 0, 0, 0.85);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        z-index: 9999999;
      }
      .trainer-panel.hidden {
        display: none !important;
      }

      /* Thanh tiêu đề */
      .panel-header {
        padding: 10px 14px;
        background: #1c1c1c;
        border-bottom: 1px solid var(--border-main);
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: move;
        user-select: none;
      }
      .panel-title {
        font-size: 13px;
        font-weight: 700;
        color: var(--text-white);
        display: flex;
        align-items: center;
        gap: 8px;
        letter-spacing: 0.5px;
      }
      .status-pill {
        font-size: 11px;
        padding: 2px 7px;
        border-radius: 4px;
        font-weight: 500;
        border: 1px solid var(--border-light);
        background: #111111;
        color: #cccccc;
      }
      .status-connected {
        border-color: #555555;
        color: #ffffff;
        background: #252525;
      }
      .status-disconnected {
        color: #777777;
        border-color: #333333;
      }
      .panel-header-btn {
        background: #252525;
        border: 1px solid var(--border-light);
        color: #d0d0d0;
        cursor: pointer;
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 3px;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: all 0.15s ease;
      }
      .panel-header-btn:hover {
        color: #ffffff;
        border-color: #777777;
        background: #333333;
      }
      .panel-bottom-bar {
        padding: 6px 12px;
        background: #181818;
        border-top: 1px solid var(--border-main);
      }
      .btn-reset-full {
        width: 100%;
        background: #242424;
        border: 1px solid #484848;
        color: #ffffff;
        font-weight: 600;
        font-size: 12px;
        padding: 6px 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .btn-reset-full:hover {
        background: #323232;
        border-color: #888888;
        color: #ffffff;
      }
      .close-btn {
        background: none;
        border: 1px solid transparent;
        color: var(--text-muted);
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
        padding: 2px 6px;
        border-radius: 3px;
      }
      .close-btn:hover {
        color: #ffffff;
        border-color: var(--border-light);
        background: #262626;
      }

      /* Thanh điều hướng tab */
      .nav-tabs {
        display: flex;
        background: #191919;
        border-bottom: 1px solid var(--border-main);
        flex-wrap: wrap;
        padding: 4px 6px;
        gap: 4px;
      }
      .tab-btn {
        background: transparent;
        border: 1px solid transparent;
        color: var(--text-muted);
        padding: 5px 11px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.1s;
      }
      .tab-btn:hover {
        color: var(--text-white);
        background: #262626;
      }
      .tab-btn.active {
        color: #000000;
        background: #e5e5e5;
        border-color: #e5e5e5;
        font-weight: 700;
      }

      /* Nội dung chính của bảng */
      .panel-body {
        padding: 12px 14px;
        overflow-y: auto;
        max-height: calc(88vh - 110px);
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .panel-body::-webkit-scrollbar {
        width: 4px;
      }
      .panel-body::-webkit-scrollbar-thumb {
        background: #333333;
        border-radius: 2px;
      }

      .tab-content {
        display: none;
        flex-direction: column;
        gap: 10px;
      }
      .tab-content.active {
        display: flex;
      }

      /* Khối nhóm */
      .card {
        background: var(--bg-card);
        border: 1px solid var(--border-main);
        border-radius: 4px;
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .card-title {
        font-size: 11px;
        font-weight: 700;
        color: #a0a0a0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 1px solid #2d2d2d;
        padding-bottom: 4px;
      }

      /* Lưới nút bấm */
      .btn-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 6px;
      }
      .btn-grid-3 {
        grid-template-columns: repeat(3, 1fr);
      }
      .btn-grid .btn {
        white-space: normal;
      }

      /* Kiểu nút */
      .btn {
        background: var(--btn-bg);
        border: 1px solid var(--btn-border);
        color: #e2e2e2;
        padding: 6px 10px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        transition: background 0.1s, border-color 0.1s;
        text-align: center;
        white-space: nowrap;
      }
      .btn:hover {
        background: var(--btn-hover);
        border-color: #666666;
        color: #ffffff;
      }
      .btn:active {
        background: #444444;
      }
      .btn-solid {
        background: #d4d4d4;
        border-color: #d4d4d4;
        color: #111111;
        font-weight: 700;
      }
      .btn-solid:hover {
        background: #ffffff;
        border-color: #ffffff;
        color: #000000;
      }

      /* Hàng điều khiển */
      .ctrl-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        font-size: 12px;
      }
      .ctrl-row span {
        flex: 1;
        color: #b5b5b5;
      }
      .ctrl-input {
        width: 80px;
        background: var(--bg-input);
        border: 1px solid var(--border-main);
        border-radius: 3px;
        color: #ffffff;
        padding: 4px 6px;
        font-size: 12px;
        text-align: right;
      }
      .ctrl-input:focus {
        outline: none;
        border-color: #777777;
      }
      .ctrl-select {
        background: var(--bg-input);
        border: 1px solid var(--border-main);
        border-radius: 3px;
        color: #ffffff;
        padding: 4px 6px;
        font-size: 12px;
      }

      .input-btn-group {
        display: flex;
        align-items: center;
        gap: 5px;
      }

      /* Thông báo nhanh (Toast) */
      .toast {
        position: absolute;
        bottom: 12px;
        left: 50%;
        transform: translateX(-50%);
        background: #252525;
        border: 1px solid #555555;
        color: #ffffff;
        padding: 5px 12px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        pointer-events: none;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
        opacity: 0;
        transition: opacity 0.2s ease;
        white-space: nowrap;
        z-index: 1000;
      }
      .toast.show {
        opacity: 1;
      }

      .footer-note {
        font-size: 11px;
        color: var(--text-muted);
        text-align: center;
        padding: 6px 14px;
        border-top: 1px solid var(--border-main);
        background: #171717;
      }
    `;
    shadow.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="trainer-panel hidden" id="panel">
        <div class="panel-header" id="panelHeader">
          <div class="panel-title">
            <span>PokéBonk Modifier</span>
            <span class="status-pill status-disconnected" id="connStatus">Đang tự dò tìm...</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <button class="panel-header-btn" id="btnHeaderReset" title="Đặt lại toàn bộ thông số và khôi phục mặc định của game">Mặc định</button>
            <button class="close-btn" id="closeBtn" title="Nhấn phím ~ để đóng">×</button>
          </div>
        </div>

        <div class="nav-tabs">
          <button class="tab-btn active" data-tab="tab-resources">Tài nguyên</button>
          <button class="tab-btn" data-tab="tab-survival">Sinh tồn</button>
          <button class="tab-btn" data-tab="tab-stats">Chỉ số</button>
          <button class="tab-btn" data-tab="tab-enemies">Kẻ địch</button>
          <button class="tab-btn" data-tab="tab-capture">Shiny & Bắt</button>
          <button class="tab-btn" data-tab="tab-world">Tốc độ & Môi trường</button>
        </div>

        <div class="panel-body">
          <!-- 1. Tài nguyên & Chỉ số -->
          <div class="tab-content active" id="tab-resources">
            <div class="card">
              <div class="card-title">Vàng trong trận</div>
              <div class="ctrl-row">
                <span>Số vàng</span>
                <div class="input-btn-group">
                  <input type="number" class="ctrl-input" id="inpGoldVal" value="100" min="0" step="10">
                  <button class="btn btn-solid" id="btnSetGold">Đặt bằng</button>
                  <button class="btn" id="btnAddGold">+Cộng thêm</button>
                </div>
              </div>
              <div class="btn-grid-3 btn-grid" style="margin-top: 2px;">
                <button class="btn" id="btnQuickGold50">+50 vàng</button>
                <button class="btn" id="btnQuickGold200">+200 vàng</button>
                <button class="btn" id="btnQuickGold1000">+1000 vàng</button>
              </div>
            </div>

            <div class="card">
              <div class="card-title">Chìa khóa & Lượt đổi thẻ</div>
              <div class="ctrl-row">
                <span>Số chìa khóa (keys)</span>
                <div class="input-btn-group">
                  <input type="number" class="ctrl-input" id="inpKeysVal" value="5" min="0" step="1">
                  <button class="btn" id="btnSetKeys">Đặt</button>
                </div>
              </div>
              <div class="ctrl-row">
                <span>Số lượt đổi lại thẻ (rerolls)</span>
                <div class="input-btn-group">
                  <input type="number" class="ctrl-input" id="inpRerollsVal" value="5" min="0" step="1">
                  <button class="btn" id="btnSetRerolls">Đặt</button>
                </div>
              </div>
              <div class="ctrl-row">
                <span>Số lượt bỏ qua/loại thẻ (skips)</span>
                <div class="input-btn-group">
                  <input type="number" class="ctrl-input" id="inpSkipsVal" value="5" min="0" step="1">
                  <button class="btn" id="btnSetSkips">Đặt</button>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-title">Cấp độ & Kinh nghiệm</div>
              <div class="ctrl-row">
                <span>Cộng kinh nghiệm (XP)</span>
                <div class="input-btn-group">
                  <input type="number" class="ctrl-input" id="inpAddXpVal" value="500" min="10" step="100">
                  <button class="btn btn-solid" id="btnApplyAddXp">+Cộng XP</button>
                </div>
              </div>
              <div class="ctrl-row">
                <span>Hệ số nhận XP (xpMult)</span>
                <div class="input-btn-group">
                  <input type="number" class="ctrl-input" id="inpXpMultVal" value="2.0" min="1" step="0.5">
                  <button class="btn" id="btnSetXpMult">Đặt</button>
                </div>
              </div>
              <div class="btn-grid" style="margin-top: 2px;">
                <button class="btn" id="btnGainLevel">Lên ngay 1 cấp (chọn thẻ)</button>
                <button class="btn" id="btnXpNext1">XP cần để lên cấp = 1</button>
                <button class="btn" id="btnMoveSlots">Mở 4 ô chiêu thức</button>
                <button class="btn" id="btnVitaminSlots">Mở 8 ô vitamin</button>
              </div>
            </div>
          </div>

          <!-- 2. Sinh tồn & Chiến đấu -->
          <div class="tab-content" id="tab-survival">
            <div class="card">
              <div class="card-title">Bảo toàn mạng sống</div>
              <div class="btn-grid">
                <button class="btn btn-solid" id="btnGodMode">Bật/tắt Bất tử (GodMode)</button>
                <button class="btn" id="btnFullHeal">Hồi đầy máu</button>
              </div>
              <div class="ctrl-row" style="margin-top: 2px;">
                <span>Thời gian miễn sát thương (giây)</span>
                <div class="input-btn-group">
                  <input type="number" class="ctrl-input" id="inpIframesVal" value="10" min="1" step="5">
                  <button class="btn" id="btnSetIframes">Đặt</button>
                </div>
              </div>
              <div class="ctrl-row">
                <span>Thời gian tàng hình (giây)</span>
                <div class="input-btn-group">
                  <input type="number" class="ctrl-input" id="inpInvisVal" value="15" min="1" step="5">
                  <button class="btn" id="btnSetInvis">Đặt</button>
                </div>
              </div>
              <div class="ctrl-row">
                <span>Số lượt hồi sinh (revives)</span>
                <div class="input-btn-group">
                  <input type="number" class="ctrl-input" id="inpRevivesVal" value="3" min="0" step="1">
                  <button class="btn" id="btnSetRevives">Đặt</button>
                </div>
              </div>
              <div class="btn-grid" style="margin-top: 2px;">
                <button class="btn" id="btnReviveDead">Hồi sinh tại chỗ</button>
                <button class="btn btn-solid" id="btnUltReady">Nạp đầy tuyệt chiêu (Ult)</button>
              </div>
            </div>
          </div>

          <!-- 3. Chỉ số nhân vật -->
          <div class="tab-content" id="tab-stats">
            <div class="card">
              <div class="card-title">Điều chỉnh chỉ số (cơ chế tempMods)</div>
              <div class="ctrl-row">
                <span>Hệ số sát thương (Damage ×N)</span>
                <div class="input-btn-group">
                  <input type="number" class="ctrl-input" id="inpDmg" value="2.0" step="0.5">
                  <button class="btn" id="btnApplyDmg">Áp dụng</button>
                </div>
              </div>
              <div class="ctrl-row">
                <span>Phạm vi tấn công (Area ×N)</span>
                <div class="input-btn-group">
                  <input type="number" class="ctrl-input" id="inpArea" value="1.5" step="0.2">
                  <button class="btn" id="btnApplyArea">Áp dụng</button>
                </div>
              </div>
              <div class="ctrl-row">
                <span>Tốc độ đánh (Attack Speed ×N)</span>
                <div class="input-btn-group">
                  <input type="number" class="ctrl-input" id="inpAtkSpd" value="1.5" step="0.2">
                  <button class="btn" id="btnApplyAtkSpd">Áp dụng</button>
                </div>
              </div>
              <div class="ctrl-row">
                <span>Số đạn bắn thêm (+N)</span>
                <div class="input-btn-group">
                  <input type="number" class="ctrl-input" id="inpProj" value="2" step="1">
                  <button class="btn" id="btnApplyProj">Áp dụng</button>
                </div>
              </div>
              <div class="ctrl-row">
                <span>Hệ số tốc độ chạy (Move Speed ×N)</span>
                <div class="input-btn-group">
                  <input type="number" class="ctrl-input" id="inpSpeed" value="1.5" step="0.2">
                  <button class="btn" id="btnApplySpeed">Áp dụng</button>
                </div>
              </div>
              <div class="ctrl-row">
                <span>Tăng phạm vi nhặt đồ (+N)</span>
                <div class="input-btn-group">
                  <input type="number" class="ctrl-input" id="inpPickup" value="30" step="10">
                  <button class="btn" id="btnApplyPickup">Áp dụng</button>
                </div>
              </div>
              <div class="ctrl-row">
                <span>Tăng may mắn (Luck +N)</span>
                <div class="input-btn-group">
                  <input type="number" class="ctrl-input" id="inpLuck" value="200" step="50">
                  <button class="btn" id="btnApplyLuck">Áp dụng</button>
                </div>
              </div>
              <div class="btn-grid" style="margin-top: 4px;">
                <button class="btn btn-solid" id="btnApplyMildStats">Gói buff nhẹ (2x sát thương / 1.5x tốc độ / +30 nhặt)</button>
                <button class="btn" id="btnClearMods">Đặt lại toàn bộ chỉ số</button>
              </div>
            </div>
          </div>

          <!-- 4. Điều chỉnh kẻ địch -->
          <div class="tab-content" id="tab-enemies">
            <div class="card">
              <div class="card-title">Hệ số kẻ địch</div>
              <div class="ctrl-row">
                <span>Hệ số máu của địch (0.5 = nửa máu)</span>
                <div class="input-btn-group">
                  <input type="number" class="ctrl-input" id="inpEnemyHp" value="0.5" step="0.1">
                  <button class="btn" id="btnSetEnemyHp">Đặt</button>
                </div>
              </div>
              <div class="ctrl-row">
                <span>Hệ số sát thương của địch (0 = không gây sát thương, 0.5 = giảm một nửa)</span>
                <div class="input-btn-group">
                  <input type="number" class="ctrl-input" id="inpEnemyDamage" value="0.5" step="0.1">
                  <button class="btn" id="btnSetEnemyDamage">Đặt</button>
                </div>
              </div>
              <div class="ctrl-row">
                <span>Tốc độ chạy của địch (0.7 = chậm hơn, dễ né)</span>
                <div class="input-btn-group">
                  <input type="number" class="ctrl-input" id="inpEnemySpeed" value="0.7" step="0.1">
                  <button class="btn" id="btnSetEnemySpeed">Đặt</button>
                </div>
              </div>
              <div class="ctrl-row">
                <span>Số địch tối đa trên màn hình (giảm để tránh giật lag)</span>
                <div class="input-btn-group">
                  <input type="number" class="ctrl-input" id="inpMaxEnemies" value="300" step="50">
                  <button class="btn" id="btnSetMaxEnemies">Đặt</button>
                </div>
              </div>
              <div class="btn-grid" style="margin-top: 2px;">
                <button class="btn" id="btnZeroEnemyDmg">Miễn nhiễm sát thương địch (0)</button>
                <button class="btn" id="btnFinalSwarm">Kích hoạt đợt quái cuối (×6 quái)</button>
              </div>
            </div>
          </div>

          <!-- 5. Shiny & Bắt Pokémon -->
          <div class="tab-content" id="tab-capture">
            <div class="card">
              <div class="card-title">Hỗ trợ bắt Pokémon</div>
              <div class="btn-grid">
                <button class="btn btn-solid" id="btnSureCapture">Ném bóng bắt chắc 100%</button>
                <button class="btn" id="btnTriggerShiny">Kích hoạt Shiny ở khung hình kế</button>
              </div>
              <div class="ctrl-row" style="margin-top: 2px;">
                <span>Kéo dài thời gian bắt Boss (giây)</span>
                <div class="input-btn-group">
                  <input type="number" class="ctrl-input" id="inpCaptureTimeVal" value="120" min="10" step="30">
                  <button class="btn" id="btnLockCaptureTime">Đặt</button>
                </div>
              </div>
              <div class="ctrl-row">
                <span>Tạo Pokémon Shiny theo số Pokédex</span>
                <div class="input-btn-group">
                  <input type="number" class="ctrl-input" id="inpSpeciesId" value="150" placeholder="150 = Mewtwo">
                  <button class="btn btn-solid" id="btnSpawnShiny">Tạo</button>
                </div>
              </div>
              <div class="btn-grid" style="margin-top: 2px;">
                <button class="btn" id="btnRollLegendShiny">Tung 1 lần Shiny huyền thoại</button>
                <button class="btn" id="btnShinyBoss">Biến địch hiện tại thành Shiny</button>
              </div>
            </div>
          </div>

          <!-- 6. Môi trường & Tốc độ -->
          <div class="tab-content" id="tab-world">
            <div class="card">
              <div class="card-title">Tốc độ game & Camera</div>
              <div class="ctrl-row">
                <span>Tốc độ chạy game (timeScale)</span>
                <div class="input-btn-group">
                  <input type="number" class="ctrl-input" id="inpTimeScaleVal" value="1.5" min="0.2" max="5.0" step="0.1">
                  <button class="btn btn-solid" id="btnSetTimeScale">Áp dụng</button>
                </div>
              </div>
              <div style="color: #ff6666; font-size: 11px; margin: 4px 0 6px 0;">⚠ Cảnh báo: đổi tốc độ game chắc chắn bị khóa tài khoản (100%), hãy cân nhắc kỹ!</div>
              <div class="btn-grid-3 btn-grid" style="margin-top: 2px;">
                <button class="btn" id="btnSpeed05">0.5x Chậm</button>
                <button class="btn" id="btnSpeed1">1.0x Bình thường</button>
                <button class="btn" id="btnSpeed2">2.0x Nhanh gấp đôi</button>
              </div>
              <div class="btn-grid" style="margin-top: 2px;">
                <button class="btn" id="btnCamOverhead">Góc nhìn từ trên cao</button>
                <button class="btn" id="btnNoTrauma">Tắt rung/lắc màn hình</button>
              </div>
            </div>
            <div class="card">
              <div class="card-title">Thời tiết & Màn chơi</div>
              <div class="ctrl-row">
                <span>Đổi thời tiết ngay</span>
                <div class="input-btn-group">
                  <select class="ctrl-select" id="selWeather">
                    <option value="clear">Quang đãng (clear)</option>
                    <option value="sun">Nắng gắt (sun)</option>
                    <option value="rain">Mưa (rain)</option>
                    <option value="snow">Tuyết (snow)</option>
                    <option value="sand">Bão cát (sand)</option>
                    <option value="fog">Sương mù (fog)</option>
                    <option value="storm">Giông bão (storm)</option>
                    <option value="wind">Gió lớn (wind)</option>
                  </select>
                  <button class="btn" id="btnSetWeather">Áp dụng</button>
                </div>
              </div>
              <div class="btn-grid" style="margin-top: 2px;">
                <button class="btn" id="btnJumpStage4">Nhảy tới giai đoạn 4</button>
                <button class="btn btn-solid" id="btnInstantClear">Đánh dấu qua màn</button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="panel-bottom-bar">
          <button class="btn btn-reset-full" id="btnResetAll" title="Đặt lại mọi thay đổi trong trận, đưa game về trạng thái gốc">Đặt lại toàn bộ chức năng</button>
        </div>

        <div class="toast" id="toast">Đã áp dụng</div>

        <div class="footer-note">
          Nhấn phím <b>~</b> để mở/ẩn bảng và nhả chuột | Esc để đóng
        </div>
      </div>
    `;
    shadow.appendChild(wrapper);

    const panel = shadow.getElementById('panel');
    const panelHeader = shadow.getElementById('panelHeader');
    const closeBtn = shadow.getElementById('closeBtn');
    const connStatus = shadow.getElementById('connStatus');
    const toast = shadow.getElementById('toast');

    let toastTimer = null;
    function showToast(msg) {
      toast.textContent = msg;
      toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toast.classList.remove('show');
      }, 1500);
    }

    function executeWithRun(callback, desc) {
      const run = getRun();
      if (!run) {
        showToast('Chưa vào trận (đang tự dò tìm)...');
        return;
      }
      try {
        callback(run);
        showToast(`${desc || 'Đã áp dụng'}`);
        updateStatus();
      } catch (err) {
        console.error('[PokéBonk Trainer] Lỗi khi thực thi:', err);
        showToast(`Lỗi: ${err.message}`);
      }
    }

    function updateStatus() {
      const run = getRun();
      if (run) {
        const lvl = run.player?.level || 1;
        const hp = Math.round(run.player?.hp || 0);
        const gold = run.gold || 0;
        connStatus.className = 'status-pill status-connected';
        connStatus.textContent = `Trong trận (Lv.${lvl} | HP:${hp} | Vàng:${gold})`;
      } else {
        connStatus.className = 'status-pill status-disconnected';
        connStatus.textContent = `Chờ vào trận`;
      }
    }
    setInterval(updateStatus, 800);

    // Điều khiển mở/đóng bảng (đồng thời quản lý việc nhả chuột)
    function openPanel() {
      isPanelOpen = true;
      panel.classList.remove('hidden');
      unlockMouse();
      updateStatus();
    }

    function closePanel() {
      isPanelOpen = false;
      panel.classList.add('hidden');
    }

    function togglePanel() {
      if (panel.classList.contains('hidden')) {
        openPanel();
      } else {
        closePanel();
      }
    }

    closeBtn.addEventListener('click', closePanel);

    // Khi rê chuột vào bảng, đảm bảo con trỏ chuột luôn được nhả
    panel.addEventListener('mouseenter', unlockMouse);
    panel.addEventListener('mousedown', unlockMouse);

    // Phím tắt toàn cục
    window.addEventListener('keydown', (e) => {
      // Không kích hoạt khi đang gõ trong ô nhập
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      if (e.key === '`' || e.key === '~' || e.key === 'Insert') {
        e.preventDefault();
        e.stopPropagation();
        togglePanel();
      } else if (e.key === 'Escape' && isPanelOpen) {
        closePanel();
      }
    }, true);

    shadow.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        shadow.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
        shadow.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
        btn.classList.add('active');
        const target = shadow.getElementById(btn.getAttribute('data-tab'));
        if (target) target.classList.add('active');
      });
    });

    // Kéo thả bảng
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;
    panelHeader.addEventListener('mousedown', (e) => {
      if (e.target === closeBtn) return;
      isDragging = true;
      offsetX = e.clientX - panel.offsetLeft;
      offsetY = e.clientY - panel.offsetTop;
    });
    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const newX = Math.max(10, Math.min(window.innerWidth - panel.offsetWidth - 10, e.clientX - offsetX));
      const newY = Math.max(10, Math.min(window.innerHeight - panel.offsetHeight - 10, e.clientY - offsetY));
      panel.style.left = `${newX}px`;
      panel.style.top = `${newY}px`;
      panel.style.right = 'auto';
    });
    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // --- Tài nguyên trong trận ---
    shadow.getElementById('btnSetGold').addEventListener('click', () => {
      const val = parseInt(shadow.getElementById('inpGoldVal').value) || 0;
      executeWithRun((run) => {
        run.gold = Math.max(0, val);
      }, `Đã đặt vàng = ${val}`);
    });

    shadow.getElementById('btnAddGold').addEventListener('click', () => {
      const val = parseInt(shadow.getElementById('inpGoldVal').value) || 0;
      executeWithRun((run) => {
        run.gold = (run.gold || 0) + val;
      }, `Đã cộng ${val} vàng`);
    });

    shadow.getElementById('btnQuickGold50').addEventListener('click', () => {
      executeWithRun((run) => {
        run.gold = (run.gold || 0) + 50;
      }, 'Đã cộng 50 vàng');
    });

    shadow.getElementById('btnQuickGold200').addEventListener('click', () => {
      executeWithRun((run) => {
        run.gold = (run.gold || 0) + 200;
      }, 'Đã cộng 200 vàng');
    });

    shadow.getElementById('btnQuickGold1000').addEventListener('click', () => {
      executeWithRun((run) => {
        run.gold = (run.gold || 0) + 1000;
      }, 'Đã cộng 1000 vàng');
    });

    shadow.getElementById('btnSetKeys').addEventListener('click', () => {
      const val = parseInt(shadow.getElementById('inpKeysVal').value) || 0;
      executeWithRun((run) => {
        run.keys = Math.max(0, val);
      }, `Đã đặt chìa khóa = ${val}`);
    });

    shadow.getElementById('btnSetRerolls').addEventListener('click', () => {
      const val = parseInt(shadow.getElementById('inpRerollsVal').value) || 0;
      executeWithRun((run) => {
        run.rerolls = Math.max(0, val);
      }, `Đã đặt lượt đổi thẻ = ${val}`);
    });

    shadow.getElementById('btnSetSkips').addEventListener('click', () => {
      const val = parseInt(shadow.getElementById('inpSkipsVal').value) || 0;
      executeWithRun((run) => {
        run.skips = Math.max(0, val);
        run.banishes = Math.max(0, val);
      }, `Đã đặt lượt bỏ qua/loại = ${val}`);
    });

    shadow.getElementById('btnApplyAddXp').addEventListener('click', () => {
      const val = parseInt(shadow.getElementById('inpAddXpVal').value) || 100;
      executeWithRun((run) => {
        run.player?.addXp?.(val);
      }, `Đã cộng ${val} XP`);
    });

    shadow.getElementById('btnSetXpMult').addEventListener('click', () => {
      const val = parseFloat(shadow.getElementById('inpXpMultVal').value) || 1.0;
      executeWithRun((run) => {
        if (run.diff) {
          run.diff.xpMult = val;
          run.diff.xp = val;
        }
      }, `Đã đặt hệ số XP = ${val}x`);
    });

    shadow.getElementById('btnGainLevel').addEventListener('click', () => {
      executeWithRun((run) => {
        run.player?.gainLevel?.();
      }, 'Đã lên 1 cấp');
    });

    shadow.getElementById('btnXpNext1').addEventListener('click', () => {
      executeWithRun((run) => {
        if (run.player) run.player.xpNext = 1;
      }, 'Đã đặt XP cần để lên cấp = 1');
    });

    shadow.getElementById('btnMoveSlots').addEventListener('click', () => {
      executeWithRun((run) => {
        if (run.player) run.player.moveSlots = 4;
      }, 'Mở 4 ô chiêu thức');
    });

    shadow.getElementById('btnVitaminSlots').addEventListener('click', () => {
      executeWithRun((run) => {
        if (run.player) run.player.vitaminSlots = 8;
      }, 'Mở 8 ô vitamin');
    });

    // --- Sinh tồn & Chiến đấu ---
    shadow.getElementById('btnGodMode').addEventListener('click', () => {
      executeWithRun((run) => {
        run.godMode = !run.godMode;
      }, 'Đã bật/tắt Bất tử');
    });

    shadow.getElementById('btnFullHeal').addEventListener('click', () => {
      executeWithRun((run) => {
        const max = run.player?.maxHp || 100;
        run.player?.heal?.(max);
        if (run.player) run.player.hp = max;
      }, 'Đã hồi đầy máu');
    });

    shadow.getElementById('btnSetIframes').addEventListener('click', () => {
      const val = parseFloat(shadow.getElementById('inpIframesVal').value) || 5;
      executeWithRun((run) => {
        if (run.player) run.player.iframes = val;
      }, `Đã đặt miễn sát thương ${val} giây`);
    });

    shadow.getElementById('btnSetInvis').addEventListener('click', () => {
      const val = parseFloat(shadow.getElementById('inpInvisVal').value) || 10;
      executeWithRun((run) => {
        if (run.player) run.player.invisT = val;
      }, `Đã đặt tàng hình ${val} giây`);
    });

    shadow.getElementById('btnSetRevives').addEventListener('click', () => {
      const val = parseInt(shadow.getElementById('inpRevivesVal').value) || 1;
      executeWithRun((run) => {
        if (run.player) run.player.revives = val;
      }, `Đã đặt lượt hồi sinh = ${val}`);
    });

    shadow.getElementById('btnReviveDead').addEventListener('click', () => {
      executeWithRun((run) => {
        if (run.player) {
          run.player.dead = false;
          run.player.heal?.(run.player.maxHp || 100);
        }
      }, 'Nhân vật đã hồi sinh tại chỗ');
    });

    shadow.getElementById('btnUltReady').addEventListener('click', () => {
      executeWithRun((run) => {
        if (run.ult) {
          run.ult.charge = 1;
          run.ult.add?.(1);
        }
      }, 'Tuyệt chiêu đã sẵn sàng');
    });

    // --- Chỉ số nhân vật ---
    function applySingleStat(stat, mul, add, name) {
      executeWithRun((run) => {
        run.tempMods = run.tempMods || [];
        const mod = { stat };
        if (typeof mul === 'number') mod.mul = mul;
        if (typeof add === 'number') mod.add = add;
        run.tempMods.push(mod);
        run.player?.recompute?.();
      }, `Đã tăng ${name}`);
    }

    shadow.getElementById('btnApplyDmg').addEventListener('click', () => {
      const val = parseFloat(shadow.getElementById('inpDmg').value) || 1.5;
      applySingleStat('damage', val, null, `sát thương ×${val}`);
    });

    shadow.getElementById('btnApplyArea').addEventListener('click', () => {
      const val = parseFloat(shadow.getElementById('inpArea').value) || 1.5;
      applySingleStat('area', val, null, `phạm vi ×${val}`);
    });

    shadow.getElementById('btnApplyAtkSpd').addEventListener('click', () => {
      const val = parseFloat(shadow.getElementById('inpAtkSpd').value) || 1.5;
      applySingleStat('attackSpeed', val, null, `tốc độ đánh ×${val}`);
    });

    shadow.getElementById('btnApplyProj').addEventListener('click', () => {
      const val = parseFloat(shadow.getElementById('inpProj').value) || 1;
      applySingleStat('projectiles', null, val, `số đạn +${val}`);
    });

    shadow.getElementById('btnApplySpeed').addEventListener('click', () => {
      const val = parseFloat(shadow.getElementById('inpSpeed').value) || 1.5;
      applySingleStat('moveSpeed', val, null, `tốc độ chạy ×${val}`);
    });

    shadow.getElementById('btnApplyPickup').addEventListener('click', () => {
      const val = parseFloat(shadow.getElementById('inpPickup').value) || 30;
      applySingleStat('pickupRange', null, val, `phạm vi nhặt +${val}`);
    });

    shadow.getElementById('btnApplyLuck').addEventListener('click', () => {
      const val = parseFloat(shadow.getElementById('inpLuck').value) || 200;
      applySingleStat('luck', null, val, `may mắn +${val}`);
    });

    shadow.getElementById('btnApplyMildStats').addEventListener('click', () => {
      executeWithRun((run) => {
        run.tempMods = run.tempMods || [];
        run.tempMods.push(
          { stat: 'damage', mul: 2.0 },
          { stat: 'moveSpeed', mul: 1.5 },
          { stat: 'attackSpeed', mul: 1.5 },
          { stat: 'pickupRange', add: 30 },
          { stat: 'luck', add: 200 }
        );
        run.player?.recompute?.();
      }, 'Đã áp dụng gói buff nhẹ');
    });

    shadow.getElementById('btnClearMods').addEventListener('click', () => {
      executeWithRun((run) => {
        run.tempMods = [];
        run.player?.recompute?.();
      }, 'Đã đặt lại toàn bộ chỉ số tạm thời');
    });

    // --- Điều chỉnh kẻ địch ---
    shadow.getElementById('btnSetEnemyHp').addEventListener('click', () => {
      const val = parseFloat(shadow.getElementById('inpEnemyHp').value) || 0.5;
      executeWithRun((run) => {
        if (run.diff) run.diff.enemyHp = val;
      }, `Đã đặt hệ số máu địch = ${val}`);
    });

    shadow.getElementById('btnSetEnemyDamage').addEventListener('click', () => {
      const val = parseFloat(shadow.getElementById('inpEnemyDamage').value) || 0.5;
      executeWithRun((run) => {
        if (run.diff) run.diff.enemyDamage = val;
      }, `Đã đặt hệ số sát thương địch = ${val}`);
    });

    shadow.getElementById('btnZeroEnemyDmg').addEventListener('click', () => {
      executeWithRun((run) => {
        if (run.diff) run.diff.enemyDamage = 0;
      }, 'Đã miễn nhiễm sát thương địch');
    });

    shadow.getElementById('btnSetEnemySpeed').addEventListener('click', () => {
      const val = parseFloat(shadow.getElementById('inpEnemySpeed').value) || 0.7;
      executeWithRun((run) => {
        if (run.diff) run.diff.enemySpeed = val;
      }, `Đã đặt hệ số tốc độ địch = ${val}`);
    });

    shadow.getElementById('btnSetMaxEnemies').addEventListener('click', () => {
      const val = parseInt(shadow.getElementById('inpMaxEnemies').value) || 300;
      executeWithRun((run) => {
        run.maxEnemies = val;
      }, `Đã đặt số địch tối đa = ${val}`);
    });

    shadow.getElementById('btnFinalSwarm').addEventListener('click', () => {
      executeWithRun((run) => {
        if (run.director) run.director.finalSwarm = true;
      }, 'Đã kích hoạt đợt quái cuối (×6 quái)');
    });

    // --- Shiny & Bắt Pokémon ---
    shadow.getElementById('btnSureCapture').addEventListener('click', () => {
      executeWithRun((run) => {
        if (run.capture) run.capture.sure = true;
      }, 'Đã bật bắt chắc 100%');
    });

    shadow.getElementById('btnLockCaptureTime').addEventListener('click', () => {
      const val = parseFloat(shadow.getElementById('inpCaptureTimeVal').value) || 120;
      executeWithRun((run) => {
        if (run.capture) {
          run.capture.sure = true;
          run.capture.weakT = val;
          run.capture.escapeT = val;
        }
      }, `Đã đặt thời gian bắt Boss ${val} giây`);
    });

    shadow.getElementById('btnTriggerShiny').addEventListener('click', () => {
      executeWithRun((run) => {
        if (run.capture) run.capture.shinyAt = 0;
      }, 'Shiny sẽ kích hoạt ở khung hình kế');
    });

    shadow.getElementById('btnRollLegendShiny').addEventListener('click', () => {
      executeWithRun((run) => {
        run.capture?.rollLegendShiny?.();
      }, 'Đã tung 1 lần Shiny huyền thoại');
    });

    shadow.getElementById('btnShinyBoss').addEventListener('click', () => {
      executeWithRun((run) => {
        run.capture?.shinyBoss?.(0);
      }, 'Đã biến mục tiêu thành Shiny');
    });

    shadow.getElementById('btnSpawnShiny').addEventListener('click', () => {
      const id = parseInt(shadow.getElementById('inpSpeciesId').value) || 150;
      executeWithRun((run) => {
        if (run.capture?.spawnShiny) {
          run.capture.spawnShiny([id]);
        } else if (run.forceLegendary) {
          run.forceLegendary = id;
        }
      }, `Đã tạo Shiny [ID: ${id}]`);
    });

    // --- Môi trường & Tốc độ ---
    shadow.getElementById('btnSetTimeScale').addEventListener('click', () => {
      const val = parseFloat(shadow.getElementById('inpTimeScaleVal').value) || 1.0;
      executeWithRun((run) => {
        run.timeScale = val;
      }, `Đã đặt tốc độ game ${val}x`);
    });

    shadow.getElementById('btnSpeed05').addEventListener('click', () => {
      executeWithRun((run) => {
        run.timeScale = 0.5;
      }, 'Đã đặt tốc độ 0.5x (chậm)');
    });

    shadow.getElementById('btnSpeed1').addEventListener('click', () => {
      executeWithRun((run) => {
        run.timeScale = 1.0;
      }, 'Đã về tốc độ 1.0x (bình thường)');
    });

    shadow.getElementById('btnSpeed2').addEventListener('click', () => {
      executeWithRun((run) => {
        run.timeScale = 2.0;
      }, 'Đã tăng tốc lên 2.0x');
    });

    shadow.getElementById('btnCamOverhead').addEventListener('click', () => {
      executeWithRun((run) => {
        run.camDist = 18;
        run.camPitch = 0.9;
      }, 'Đã chuyển sang góc nhìn từ trên cao');
    });

    shadow.getElementById('btnNoTrauma').addEventListener('click', () => {
      executeWithRun((run) => {
        run.trauma = 0;
        run.hitstopT = 0;
      }, 'Đã tắt rung màn hình');
    });

    shadow.getElementById('btnSetWeather').addEventListener('click', () => {
      const weather = shadow.getElementById('selWeather').value;
      executeWithRun((run) => {
        run.weather = weather;
      }, `Đã đổi thời tiết: ${weather}`);
    });

    shadow.getElementById('btnJumpStage4').addEventListener('click', () => {
      executeWithRun((run) => {
        run.stage = 4;
        run.stageTime = 0;
      }, 'Đã nhảy tới giai đoạn 4');
    });

    shadow.getElementById('btnInstantClear').addEventListener('click', () => {
      executeWithRun((run) => {
        run.regionCleared = true;
      }, 'Đã đánh dấu qua màn');
    });

    // --- Khôi phục toàn bộ chức năng về mặc định ---
    function resetAllToDefault() {
      executeWithRun((run) => {
        // 1. Đặt lại sinh tồn & chiến đấu
        run.godMode = false;
        if (run.player) {
          run.player.iframes = 0;
          run.player.invisT = 0;
          run.player.dead = false;
        }

        // 2. Đặt lại hệ số kẻ địch & độ khó (về mức chuẩn 1.0)
        if (run.diff) {
          run.diff.enemyHp = 1.0;
          run.diff.enemyDamage = 1.0;
          run.diff.enemySpeed = 1.0;
          run.diff.enemyAmount = 1.0;
          run.diff.xpMult = 1.0;
          run.diff.xp = 1.0;
        }
        if (run.player && run.player.stats) {
          run.player.stats.difficulty = 1.0;
          run.player.stats.enemyAmount = 1.0;
        }
        run.maxEnemies = 500;
        if (run.director) {
          run.director.finalSwarm = false;
        }

        // 3. Xóa sạch buff/debuff thêm của người chơi (tempMods) và tính lại chỉ số
        run.tempMods = [];
        run.player?.recompute?.();

        // 4. Đặt lại bắt Pokémon & Shiny
        if (run.capture) {
          run.capture.sure = false;
          delete run.capture.weakT;
          delete run.capture.escapeT;
        }
        run.shinySkin = false;
        delete run.forceLegendary;

        // 5. Đặt lại camera, rung màn hình & tốc độ game
        run.timeScale = 1.0;
        run.camDist = 9;
        run.camPitch = 0.45;
        run.camYaw = 0;
        run.trauma = 0;
        run.hitstopT = 0;
        run.weather = 'clear';

        // 6. Đưa mọi ô nhập trên giao diện về giá trị mặc định
        const inputDefaults = {
          inpGoldVal: '100',
          inpKeysVal: '5',
          inpRerollsVal: '5',
          inpSkipsVal: '5',
          inpAddXpVal: '500',
          inpXpMultVal: '1.0',
          inpIframesVal: '10',
          inpInvisVal: '15',
          inpRevivesVal: '3',
          inpDmg: '1.0',
          inpArea: '1.0',
          inpAtkSpd: '1.0',
          inpProj: '0',
          inpSpeed: '1.0',
          inpPickup: '0',
          inpLuck: '0',
          inpEnemyHp: '1.0',
          inpEnemyDamage: '1.0',
          inpEnemySpeed: '1.0',
          inpMaxEnemies: '500',
          inpCaptureTimeVal: '120',
          inpSpeciesId: '150',
          inpTimeScaleVal: '1.0',
        };

        for (const [id, defaultVal] of Object.entries(inputDefaults)) {
          const el = shadow.getElementById(id);
          if (el) el.value = defaultVal;
        }
        const selW = shadow.getElementById('selWeather');
        if (selW) selW.value = 'clear';
      }, 'Đã khôi phục toàn bộ chức năng về mặc định');
    }

    const btnResetAll = shadow.getElementById('btnResetAll');
    if (btnResetAll) btnResetAll.addEventListener('click', resetAllToDefault);

    const btnHeaderReset = shadow.getElementById('btnHeaderReset');
    if (btnHeaderReset) btnHeaderReset.addEventListener('click', resetAllToDefault);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    initUI();
  }
})();

const searchInput = document.querySelector('.search-input');
      const searchIcon = document.querySelector('.search-icon');
      const searchDropdown = document.querySelector('.search-dropdown');
      const searchOptions = document.querySelectorAll('.search-option');
      const clockElement = document.getElementById('clock');
      const dateLabel = document.getElementById('date-label');
      let clockInterval = null;
      let currentDateKey = '';

      function formatTime(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
      }

      function formatDateLabel(date) {
        const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const week = weekDays[date.getDay()];
        return `${month}月${day}日 星期${week}`;
      }

      function updateDateLabel(date) {
        dateLabel.textContent = formatDateLabel(date);
        currentDateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      }

      function updateClock() {
        if (document.hidden) return;
        const now = new Date();
        clockElement.textContent = formatTime(now);
        const todayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
        if (todayKey !== currentDateKey) {
          updateDateLabel(now);
        }
      }

      function startClock() {
        const now = new Date();
        updateDateLabel(now);
        updateClock();
        stopClock();
        clockInterval = setInterval(updateClock, 1000);
      }

      function stopClock() {
        if (clockInterval !== null) {
          clearInterval(clockInterval);
          clockInterval = null;
        }
      }

      document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
          stopClock();
        } else {
          startClock();
        }
      });

      startClock();

      let currentEngine = {
        name: 'Bing',
        base: 'https://cn.bing.com/search?q=',
      };

      function updatePlaceholder() {
        searchInput.placeholder = `使用${currentEngine.name}搜索`;
      }

      function closeDropdown() {
        searchDropdown.hidden = true;
        searchDropdown.classList.remove('open');
      }

      function toggleDropdown() {
        if (searchDropdown.hidden) {
          searchDropdown.hidden = false;
          searchDropdown.classList.add('open');
        } else {
          searchDropdown.hidden = true;
          searchDropdown.classList.remove('open');
        }
      }

      searchIcon.addEventListener('click', function (event) {
        event.stopPropagation();
        toggleDropdown();
      });

      searchOptions.forEach((option) => {
        option.addEventListener('click', function () {
          currentEngine = {
            name: option.dataset.name,
            base: option.dataset.base,
          };
          updatePlaceholder();
          closeDropdown();
        });
      });

      /* 自定义搜索引擎：
         1. 在 HTML 中复制一个 search-option 按钮。
         2. 修改 data-name 为显示名称。
         3. 修改 data-base 为你的搜索地址前缀，例如：
            https://search.bilibili.com/all?keyword=
         4. 点击后会自动切换到该搜索引擎并按回车搜索。
      */
      document.addEventListener('click', function (event) {
        if (!searchIcon.contains(event.target) && !searchDropdown.contains(event.target)) {
          closeDropdown();
        }
      });

      searchInput.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter') return;
        const query = searchInput.value.trim();
        if (!query) return;
        const url = currentEngine.base + encodeURIComponent(query);
        window.open(url, '_self');
      });

      updatePlaceholder();
// Dependencies
var cssesc = require('cssesc');
var utils = require('utils');

// Don't show sidebar until it's worth it
var OVERFLOW_PRECISION = 10;
// Debounce delay for resize event
var DEBOUNCE_DELAY = 100;


/**
 * Tabs
 *
 * @param  {Element} el
 * @param  {Object} props
 */
function Tabs(el, props) {
  this.el = el;
  this.props = props || {};
  this.props.nav = this.el.querySelector('nav');
  this.props.navParent = this.props.nav.parentElement;
  this.props.tabs = this.el.querySelectorAll('nav a');
  this.props.panels = [];
  this.props.isOverflowing = false;
  this.props.isOverflowSetup = false;
  this.props.isLoadingPs = false;
  this.props.isNav = this.el.classList.contains('tabbed-nav');
  this.props.matchFoundForHash = false;

  // Event bindings
  if (this.el.hasAttribute('data-tabbed')) {
    this.setup();
    this.move(this.getInitialTab());

    // If hash matches a tab, scroll to the tabs
    if (this.props.matchFoundForHash) {
      this.scrollToTabs();
    }

    this.handleResize();
    window.addEventListener('resize', utils.debounce(this.handleResize.bind(this), DEBOUNCE_DELAY));
  }
}

Tabs.label = 'Tabs';
Tabs.selector = '[data-tabbed]';

/**
 * Set up the tab panels and event listeners.
 */
Tabs.prototype.setup = function() {
  var i, len, tab;

  // Hide all panels by default
  var panels = this.el.querySelectorAll('[role="tabpanel"]');
  for (i = 0, len = panels.length; i < len; i++) {
    if (panels[i].parentElement === this.el) { // exclude panels of any nested tabs component
      panels[i].style.display = 'none';
      this.props.panels.push(panels[i]);
    }
  }

  // Handle clicks on tabs
  for (i = this.props.tabs.length - 1; i >= 0; i--) {
    tab = this.props.tabs[i];
    tab.addEventListener('click', this.handleClick.bind(this, tab));
  }

  // Handle clicks on internal tab links
  var tabLinks = this.el.querySelectorAll('[data-tab]');
  for (i = tabLinks.length - 1; i >= 0; i--) {
    tabLinks[i].addEventListener('click', this.handleInternalClick.bind(this, tabLinks[i]));
  }
};

/**
 * Retrieve the initial tab on page load.
 * There are four ways of determine which tab to start on!
 * @return {Element}
 */
Tabs.prototype.getInitialTab = function() {
  // 1. From JS props
  if (this.props.preselect) {
    return this.props.preselect;
  }

  // 2. From window hash (for navigational tabs only)
  if (window.location.hash && this.props.isNav) {
    // Find the tab that matches the hash
    for (var i = 0, max = this.props.tabs.length; i < max; i++) {
      var tab = this.props.tabs[i];
      if (window.location.hash === tab.hash) {
        // Match found; return it
        this.props.matchFoundForHash = true;
        return tab;
      }
    }

    // No match found; check for a matching inner tab (i.e. sidebar tabs, not in-page tabs)
    var innerPanel = this.el.querySelector('#' + cssesc(window.location.hash.substr(1), { 'isIdentifier': true }) + '.sidebar-tabs__panel');
    if (innerPanel) {
      // Inner-tab panel matches hash; find its parent panel's tab and return it
      var panel = utils.findUp(innerPanel, 'tab');
      return this.el.querySelector('nav a[href="#' + panel.id + '"]');
    }
  }

  // 3. From `data-current` attribute, or
  // 4. First tab (default)
  return this.el.querySelector('[data-current]') || this.el.querySelector('nav a:first-child');
};

/**
 * On page load and resize, check whether the tabs fit on one row.
 * If they don't, activate the overflow behaviour (horizontal scroll).
 * On fist call, load the `perfect-scrollbar` library asynchronously.
 */
Tabs.prototype.handleResize = function() {
  // Check whether the full-width container is narrower than the navigation element
  var isOverflowing = this.el.clientWidth <= this.props.nav.clientWidth - OVERFLOW_PRECISION;

  // Activate or deactivate the overflow behaviour when needed
  if (isOverflowing !== this.props.isOverflowing) {
    // Save overflow state
    this.props.isOverflowing = isOverflowing;

    if (isOverflowing) {
      if (!this.props.isOverflowSetup) {
        if (!this.props.isLoadingPs) {
          // Load the 'perfect-scrollbar' library then setup the overflow behaviour
          this.props.isLoadingPs = true;
          utils.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jquery.perfect-scrollbar/0.7.0/js/perfect-scrollbar.min.js')
            .then(this.setupOverflow.bind(this));
        }
      } else {
        // Bring up the horizontal scrollbar
        this.activateOverflow(true);
      }
    } else {
      // Remove the horizontal scrollbar
      this.destroyOverflow();
    }
  } else if (isOverflowing && this.props.isOverflowSetup) {
    // If initialised and still overflowing, only update the horizontal scrollbar and scroll to the selected tab
    window.Ps.update(this.props.inner);
    this.scrollToTab(this.el.querySelector('[data-current]'), true);
  }
};

/**
 * Prepare the DOM for the overflow behaviour.
 */
Tabs.prototype.setupOverflow = function() {
  // Wrap nav in div to hold horizontal scrollbar
  var inner = document.createElement('div');
  inner.className = 'tabbed-nav__inner';
  inner.appendChild(this.props.nav);

  // Build arrows
  var leftArrow = document.createElement('button');
  leftArrow.className = 'button-ui tab-arrow';
  leftArrow.setAttribute('type', 'button');
  var rightArrow = leftArrow.cloneNode(false);
  leftArrow.innerHTML = '&lsaquo;';
  leftArrow.className += ' tab-arrow--left';
  rightArrow.innerHTML = '&rsaquo;';
  rightArrow.className += ' tab-arrow--right';

  // Store references to new elements
  this.props.inner = inner;
  this.props.leftArrow = leftArrow;
  this.props.rightArrow = rightArrow;

  // Append wrapper and arrows
  this.props.navParent.appendChild(leftArrow);
  this.props.navParent.appendChild(inner);
  this.props.navParent.appendChild(rightArrow);

  // Listen for clicks on arrows
  leftArrow.addEventListener('click', this.handleArrowClick.bind(this, 'left'));
  rightArrow.addEventListener('click', this.handleArrowClick.bind(this, 'right'));

  // Listen for scroll events to enable/disable arrows
  document.addEventListener('ps-scroll-right', this.updateArrow.bind(this, 'left', true));
  document.addEventListener('ps-scroll-left', this.updateArrow.bind(this, 'right', true));
  document.addEventListener('ps-x-reach-start', this.updateArrow.bind(this, 'left', false));
  document.addEventListener('ps-x-reach-end', this.updateArrow.bind(this, 'right', false));

  this.props.isLoadingPs = false;
  this.props.isOverflowSetup = true;

  // Activate the overflow behaviour
  this.activateOverflow(false);
};

/**
 * Activate the overflow behaviour and initialise the horizontal scrollbar.
 * @param {Boolean} smooth - whether to scroll to the selected tab smoothly
 */
Tabs.prototype.activateOverflow = function(smooth) {
  // Active the overflow
  this.props.navParent.classList.add('overflow');

  // Initialise the scrollbar
  window.Ps.initialize(this.props.inner, {
    useBothWheelAxes: true,
    wheelPropagation: true
  });

  // Scroll to the selected tab
  this.scrollToTab(this.el.querySelector('[data-current]'), smooth);
};

/**
 * Deactivate the overflow behaviour and destroy the horizontal scrollbar.
 */
Tabs.prototype.destroyOverflow = function() {
  this.props.navParent.classList.remove('overflow');
  window.Ps.destroy(this.props.inner);
};

/**
 * Update the state of one of the two overflow arrows.
 * @param {String} arrow - `left` or `right`
 * @param {Boolen} enable - `true` to enable the arrow
 */
Tabs.prototype.updateArrow = function(arrow, enable) {
  var arrowElem = this.props[arrow + 'Arrow'];
  if (enable) {
    arrowElem.removeAttribute('disabled');
  } else {
    arrowElem.setAttribute('disabled', 'disabled');
  }
};

/**
 * Handle clicks on the overflow arrows.
 * @param {String} direction - `left` or `right`
 */
Tabs.prototype.handleArrowClick = function(direction) {
  var start = this.props.inner.scrollLeft;
  var multiplier = direction === 'left' ? -1 : 1;
  var to = start + multiplier * this.props.inner.clientWidth / 2;
  this.scrollTabs(to, true);
};

/**
 * Handle clicks on tabs.
 * @param {Element} tab
 * @param {Event} e
 */
Tabs.prototype.handleClick = function(tab, e) {
  e.preventDefault();

  var href = tab.getAttribute('href');
  if (href.charAt(0) === '#') {
    this.move(tab, true);

    // If navigation tab, scroll
    if (this.props.isNav) {
      utils.smoothScrollTo(tab);
    }
  }

  // Set page location
  this.setLocation(href);
};

Tabs.prototype.panelExists = function(id) {
  // Loop through panel IDs looking for a match
  for (var i = this.props.panels.length - 1; i >= 0; i--) {
    if (this.props.panels[i].id === id) {
      // Match found
      return true;
    }
  }

  // No match found
  return false;
};

Tabs.prototype.setLocation = function(href) {
  // Return if not navigational tabs
  if (!this.props.isNav) {
    return;
  }

  if (href.charAt(0) === '#') {
    // Hash link; get ID of target
    var targetId = href.substr(1);

    // If a panel exists with this ID, set location
    if (this.panelExists(targetId)) {
      // Use History API if available to prevent unwanted jump scroll
      if (history.pushState) {
        history.pushState({'title': document.title, 'url': href}, document.title, href);
      } else {
        window.location.hash = href;
      }
    }
  } else {
    // External link; set location
    window.location = href;
  }
};

/**
 * Handle clicks on internal tab links (i.e. to navigate to another tab from within the content).
 * @param {Element} link
 * @param {Event}
 */
Tabs.prototype.handleInternalClick = function(link, e) {
  e.preventDefault();

  // Parse index of tab to navigate to
  var index = parseInt(link.getAttribute('data-tab'), 10) - 1;

  this.moveindex(index);
  this.setLocation(this.props.tabs[index].hash);

  // If navigation tab, scroll
  if (this.props.isNav) {
    utils.smoothScrollTo(this.props.tabs[index]);
  }
};

/**
 * Match target
 */
Tabs.prototype.getIndex = function(target) {
  var curr = 0, max, i;

  for (max=this.props.tabs.length, i=0; i < max; i++)
    if (this.props.tabs[i] === target)
      curr = i;

  return curr;
};

/**
 * Match target
 */
Tabs.prototype.move = function(target, smooth) {
  this.movetab(this.getIndex(target));
  this.scrollToTab(target, smooth);

  if (this.props.panels.length === 1) {
    this.showPanel(this.props.panels[0]);
  } else {
    for (var i = 0, max = this.props.panels.length; i < max; i++) {
      if (target.getAttribute('href') === '#' + this.props.panels[i].id) {
        this.showPanel(this.props.panels[i]);
      } else {
        this.hidePanel(this.props.panels[i]);
      }
    }
  }

  this.redraw();
};

// Trigger a resize event to activate 3rd party code
Tabs.prototype.redraw = function() {
  var e;
  if (document.createEvent) {
    e = document.createEvent("HTMLEvents");
    e.initEvent("resize", true, true);
  } else {
    e = document.createEventObject();
    e.eventType = "resize";
  }

  e.eventName = "resize";

  if (document.createEvent) {
    window.dispatchEvent(e);
  } else {
    window.fireEvent("on" + e.eventType, e);
  }
};

Tabs.prototype.scrollToTab = function(tab, smooth) {
  if (this.props.isOverflowSetup && this.props.isOverflowing) {
    var to = tab.offsetLeft - this.props.inner.clientWidth / 2 + tab.clientWidth / 2;
    this.scrollTabs(to, smooth);
  }
};

Tabs.prototype.scrollTabs = function(to, smooth) {
  if (smooth) {
    var start = this.props.inner.scrollLeft;
    var change = to - start;
    var increment = Math.abs(change / 500);
    var duration = Math.abs(change / 10);
    this.animateTabsScroll(0, start, change, duration, increment);
  } else {
    this.props.inner.scrollLeft = to;
    window.Ps.update(this.props.inner);
  }
};

Tabs.prototype.animateTabsScroll = function(curr, start, change, duration, increment) {
  curr += increment;
  this.props.inner.scrollLeft = utils.easeInOutQuad(curr, start, change, duration);

  if (curr < duration) {
    setTimeout(this.animateTabsScroll.bind(this, curr, start, change, duration, increment), increment);
  } else {
    // If the tabs are still overflowing when the scrolling ends, update the scrollbars
    if (this.props.isOverflowing) {
      window.Ps.update(this.props.inner);
    }
  }
};

Tabs.prototype.moveindex = function(index) {
  this.movetab(index);

  for (var i = 0, max = this.props.panels.length; i < max; i++) {
    if (index === i) {
      this.showPanel(this.props.panels[i]);
    } else {
      this.hidePanel(this.props.panels[i]);
    }
  }
};

Tabs.prototype.movetab = function(index) {
  for (var i = 0, max = this.props.tabs.length; i < max; i++) {
    if (i === index) {
      this.props.tabs[i].setAttribute('data-current', '');
    } else {
      this.props.tabs[i].removeAttribute('data-current');
    }
  }
};

Tabs.prototype.showPanel = function(panel) {
  panel.setAttribute('data-current', '');
  panel.style.display = 'block';
};

Tabs.prototype.hidePanel = function(panel) {
  panel.removeAttribute('data-current');
  panel.style.display = 'none';
};

Tabs.prototype.scrollToTabs = function() {
  setTimeout(function () {
    window.scroll(0, 0); // prevent scroll jump due to URL hash

    // Compute offset (same as in smoothScrollTo function)
    var offset = this.el.getBoundingClientRect().top;
    var headerElem = document.querySelector('.page-header');
    if (headerElem && !headerElem.classList.contains('floating')) {
      var headerPosition = window.getComputedStyle ? window.getComputedStyle(headerElem).getPropertyValue('position') : 'fixed';
      offset -= ((headerPosition === 'fixed' || headerPosition === 'absolute') ? 40 : 0);
    }

    // Perform scroll
    window.scroll(0, offset);
  }.bind(this));
};

module.exports = Tabs;

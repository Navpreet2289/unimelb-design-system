var bus = require('shared/bus').default;

/**
 * Accordion
 *
 * @param  {Element} el
 * @param  {Object} props
 */
function Accordion(el, props) {
  this.el = el;
  this.props = props || {};
  this.emit = bus.nsEmit(Accordion);

  this.props.container = this.el.parentNode;
  this.props.hidden = this.props.container.querySelector('.accordion__hidden');

  this.el.setAttribute('tabindex', '0');
  this.props.hidden.setAttribute('tabindex', '-1'); // make panel focusable

  this.setupCloseButton();
  this.el.addEventListener('click', this.handleClick.bind(this));

  // HACK: IE9 doesn't fire click event when pressing Enter
  window.addEventListener('keydown', this.clickWithEnter.bind(this));
}

// Component name and selector for registration
Accordion.label = 'Accordion';
Accordion.selector = '.accordion__title';

Accordion.prototype.setupCloseButton = function() {
  var close = this.props.container.querySelector('.accordion__close');
  if (!close) {
    close = document.createElement('a');
    close.className = 'accordion__close';

    if (!this.props.hidden.querySelector('.accordion__close')) {
      if (this.props.hidden.nodeName == 'TR') {
          var firstElem = this.props.hidden.firstElementChild;
          if (firstElem) {
            firstElem.appendChild(close);
          }
      } else {
        this.props.hidden.appendChild(close);
      }
    }

    close.addEventListener('click', function(e){
      e.preventDefault();
      this.props.container.classList.toggle('accordion__visible');
    }.bind(this));
  }
};

Accordion.prototype.handleClick = function(e) {
  e.preventDefault();

  // Determine overall container to check for single focus
  var container = this.props.container.parentNode;

  // Reasonable expectations, if the trigger is wrapped
  if (container.nodeName == 'TR' || container.parentNode.nodeName == 'TR') {
    while (container.nodeName != 'TABLE') {
      if (container.parentNode)
        container = container.parentNode;
    }
  }

  var isSingleFocus = container.hasAttribute('data-single-focus');
  if (isSingleFocus) {
    // Save the distance of the accordion trigger from the top of the viewport
    var offset = this.el.getBoundingClientRect().top;

    for (var recs=container.querySelectorAll('.accordion__visible'), i=recs.length - 1; i >= 0; i--) {
      if (recs[i] !== this.props.container) {
        recs[i].classList.remove('accordion__visible');
      }
    }
  }

  // Toggle panel visibility
  this.props.container.classList.toggle('accordion__visible');
  this.emit('panelToggled');

  // Deal with focus and scrolling issues
  if (isSingleFocus) {
    // If accordion is single-focus, wait for layout to update then restore scroll position
    setTimeout(this.restoreScrollPosition.bind(this, offset));
  } else {
    // Otherwise, skip straight to managing focus
    this.manageFocus();
  }
};

/**
 * Restore scroll position if needed.
 * https://github.com/unimelb/unimelb-design-system/issues/533
 * @param {Number} oldOffset - the offset before toggling
 */
Accordion.prototype.restoreScrollPosition = function (oldOffset) {
  // If the element has shifted out of view, bring it back to the same position
  var newOffset = this.el.getBoundingClientRect().top;
  if (newOffset < 0) window.scrollBy(0, newOffset - oldOffset);

  // Since setting focus can affect scrolling, it must be done after restoring the scroll position
  this.manageFocus();
};

/**
 * Manage focus smartly to avoid having to remove the outline with CSS.
 */
Accordion.prototype.manageFocus = function () {
  if (this.props.container.classList.contains('accordion__visible')) {
    // Focus panel on open
    this.props.hidden.focus();
  } else {
    // Blur target on close
    this.el.blur();
  }
};

// HACK: IE9 doesn't fire click event when pressing Enter
Accordion.prototype.clickWithEnter = function(e) {
  var elem = document.activeElement;
  if (elem == this.el) {
    // Use window.event if available
    if (typeof e === 'undefined' && window.event) {
      e = window.event;
    }

    // Trigger click on ENTER (13)
    if (e.keyCode == 13) {
      elem.click();
    }
  }
};

module.exports = Accordion;

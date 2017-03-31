import {
  components,
  initComponent,
  initAllComponents,
  registerComponents
} from '../../shared/component-manager.es6';

import * as utils from '../../utils/index.es6';
import cssesc from 'cssesc';

import Accordion from '../../components/accordion';
import Checklist from '../../components/checklist';
import CheckboxHelper from '../../components/checklist/checkboxhelper';
import FilteredListing from '../../components/filtered-listings';
import FancySelect from '../../components/forms/fancyselect';
import ImageGallery from '../../components/gallery';
import InpageNavigation from '../../components/inpage-navigation';
import Modal from '../../components/modal';
import SidebarTabs from '../../components/tabs/sidebar-tabs';
import Tabs from '../../components/tabs';
import ValidateForm from '../../components/forms';

// Polyfills
require('es6-promise').polyfill();
require('classlist-polyfill');

// Build API object
window.uom = {
  // component manager
  components,
  initComponent,
  initAllComponents,
  registerComponents,

  // utilities and third-party dependencies
  utils,
  vendor: {
    cssesc
  }
};

// Register the design system's components
window.uom.registerComponents([
  Accordion,
  Checklist,
  CheckboxHelper,
  FilteredListing,
  FancySelect,
  ImageGallery,
  InpageNavigation,
  Modal,
  SidebarTabs,
  Tabs,
  ValidateForm
]);

// Toggle JS classes on document root
document.documentElement.classList.remove('no-js');
document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', window.uom.initAllComponents, false);


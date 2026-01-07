import { loadPartial } from '../../lib/partialLoader';
import VariantSwitch from '../shared/VariantSwitch';

const desktopMarkup = loadPartial('../src/partials/layout/headerdesktop.html');
const mobileMarkup = loadPartial('../src/partials/layout/headermobile.html');

const SiteHeader = () => (
  <div data-role="site-header" data-layout-managed="next">
    <VariantSwitch desktopHtml={desktopMarkup} mobileHtml={mobileMarkup} />
  </div>
);

export default SiteHeader;

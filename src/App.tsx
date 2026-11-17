/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DesktopProvider } from './os/DesktopContext';
import { DesktopWorkspace } from './os/DesktopWorkspace';

export default function App() {
  return (
    <DesktopProvider>
      <DesktopWorkspace />
    </DesktopProvider>
  );
}

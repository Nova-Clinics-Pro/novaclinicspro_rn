import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.resolve(__dirname, '../../../app/doctor.tsx'), 'utf8');

describe('Doctor logout platform boundary', () => {
  it('uses browser confirmation before invoking the shared logout on web', () => {
    const logout = source.slice(source.indexOf('const handleLogout'), source.indexOf('// Get error message'));
    expect(logout).toContain("Platform.OS === 'web'");
    expect(logout).toContain("window.confirm('Are you sure you want to logout?')");
    expect(logout).toContain('void logout().catch');
  });

  it('retains native Alert confirmation behavior', () => {
    const logout = source.slice(source.indexOf('const handleLogout'), source.indexOf('// Get error message'));
    expect(logout).toContain('Alert.alert(');
    expect(logout).toContain("text: 'Logout'");
  });
});

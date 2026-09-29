import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.resolve(__dirname, '../../../core/api/axiosClient.ts'),
  'utf8'
);

describe('Axios loading-safety wiring', () => {
  it('tracks ordinary transport requests without changing the existing HTTP timeout policy', () => {
    expect(source).toContain("timeout: 30000");
    expect(source).toContain('beginApiRequest(config);');
    expect(source).toContain('completeApiRequest(response.config);');
    expect(source).toContain('completeApiRequest(originalRequest, error);');
  });

  it('allows declared long-running workflows to opt out of the ordinary fallback', () => {
    expect(source).toContain("apiLoadingMode?: ApiLoadingMode;");
  });
});

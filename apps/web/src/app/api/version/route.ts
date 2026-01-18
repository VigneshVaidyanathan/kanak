import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET(): Promise<NextResponse> {
  try {
    // Read package.json from the root of the workspace
    // In a monorepo, process.cwd() points to apps/web, so we go up two levels
    const packageJsonPath = join(process.cwd(), '..', '..', 'package.json');
    const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    return NextResponse.json({
      version: packageJson.version || '1.0.0',
    });
  } catch (error) {
    // Fallback to default version if reading fails
    return NextResponse.json({ version: '1.0.0' }, { status: 200 });
  }
}

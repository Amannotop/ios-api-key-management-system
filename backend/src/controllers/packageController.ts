import { Request, Response } from 'express';
import prisma from '../prisma';
import { z } from 'zod';

const packageSchema = z.object({
  name: z.string().min(1),
  bundleId: z.string().min(1),
  displayName: z.string().optional(),
  iconUrl: z.string().optional(),
});

const updatePackageSchema = z.object({
  name: z.string().optional(),
  displayName: z.string().optional(),
  iconUrl: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function getPackagesHandler(req: Request, res: Response): Promise<void> {
  try {
    const packages = await prisma.package.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(packages);
  } catch (error) {
    console.error('Get packages error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function createPackageHandler(req: Request, res: Response): Promise<void> {
  const result = packageSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }

  try {
    // Check if bundleId already exists
    const existing = await prisma.package.findUnique({
      where: { bundleId: result.data.bundleId },
    });

    if (existing) {
      res.status(400).json({ error: 'Bundle ID already registered' });
      return;
    }

    const pkg = await prisma.package.create({
      data: result.data,
    });

    res.status(201).json(pkg);
  } catch (error) {
    console.error('Create package error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function updatePackageHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const result = updatePackageSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }

  try {
    const pkg = await prisma.package.update({
      where: { id },
      data: result.data,
    });

    res.json(pkg);
  } catch (error) {
    console.error('Update package error:', error);
    res.status(500).json({ error: 'Package not found' });
  }
}

export async function deletePackageHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    await prisma.package.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete package error:', error);
    res.status(500).json({ error: 'Package not found' });
  }
}

// Get package by bundle ID (for license check)
export async function getPackageByBundleHandler(req: Request, res: Response): Promise<void> {
  const { bundleId } = req.params;

  try {
    const pkg = await prisma.package.findUnique({
      where: { bundleId },
    });

    if (!pkg) {
      res.status(404).json({ error: 'Package not found' });
      return;
    }

    if (!pkg.isActive) {
      res.status(400).json({ error: 'Package is inactive' });
      return;
    }

    res.json(pkg);
  } catch (error) {
    console.error('Get package error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
}
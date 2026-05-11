import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../dist/lib/auth.js'

const prisma = new PrismaClient()

async function main() {
  console.log('Creating demo business...')

  const business = await prisma.business.upsert({
    where: { apiKey: 'demo-api-key-123' },
    update: {},
    create: {
      name: 'Al-Sultan Restaurant',
      apiKey: 'demo-api-key-123',
      whatsappPhoneNumber: '+966500000000',
      whatsappPhoneNumberId: 'demo-phone-id',
    },
  })

  console.log('Created business:', business.name)

  // ─────────────────────────────────────────────────────────────────────────────
  // IAM: Permissions (27 total)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('Creating permissions...')

  const permissionData = [
    { code: 'users:read', name: 'View Users', description: 'View user list and details', category: 'users' },
    { code: 'users:create', name: 'Create Users', description: 'Invite new users to the business', category: 'users' },
    { code: 'users:update', name: 'Update Users', description: 'Edit user name and active status', category: 'users' },
    { code: 'users:delete', name: 'Delete Users', description: 'Deactivate (soft-delete) a user', category: 'users' },
    { code: 'users:assign-roles', name: 'Assign Roles', description: 'Grant or revoke roles on a user', category: 'users' },
    { code: 'roles:read', name: 'View Roles', description: 'View role list and their permissions', category: 'roles' },
    { code: 'roles:create', name: 'Create Roles', description: 'Create a custom tenant role', category: 'roles' },
    { code: 'roles:update', name: 'Update Roles', description: 'Edit role name, description, permissions', category: 'roles' },
    { code: 'roles:delete', name: 'Delete Roles', description: 'Remove a custom tenant role', category: 'roles' },
    { code: 'menu:read', name: 'View Menu', description: 'View categories and items', category: 'menu' },
    { code: 'menu:create', name: 'Create Items', description: 'Add categories and items', category: 'menu' },
    { code: 'menu:update', name: 'Update Items', description: 'Edit categories and items', category: 'menu' },
    { code: 'menu:delete', name: 'Delete Items', description: 'Remove categories and items', category: 'menu' },
    { code: 'menu:toggle', name: 'Toggle Availability', description: 'Enable or disable menu items', category: 'menu' },
    { code: 'orders:read', name: 'View Orders', description: 'View order list and details', category: 'orders' },
    { code: 'orders:create', name: 'Create Orders', description: 'Place orders on behalf of customers', category: 'orders' },
    { code: 'orders:update-status', name: 'Update Order Status', description: 'Change order status', category: 'orders' },
    { code: 'orders:delete', name: 'Delete Orders', description: 'Remove or cancel orders', category: 'orders' },
    { code: 'settings:read', name: 'View Settings', description: 'View business settings', category: 'settings' },
    { code: 'settings:update', name: 'Update Settings', description: 'Edit business settings', category: 'settings' },
    { code: 'conversations:read', name: 'View Conversations', description: 'View chat conversations', category: 'conversations' },
    { code: 'conversations:send', name: 'Send Messages', description: 'Send messages to customers', category: 'conversations' },
    { code: 'conversations:delete', name: 'Delete Conversations', description: 'Remove conversations', category: 'conversations' },
    { code: 'audit:read', name: 'View Audit Logs', description: 'View audit trail', category: 'audit' },
    { code: 'audit:export', name: 'Export Audit Logs', description: 'Download audit logs', category: 'audit' },
    { code: 'business:read', name: 'View Business Info', description: 'View business profile', category: 'business' },
    { code: 'business:update', name: 'Update Business', description: 'Edit business profile', category: 'business' },
    // Platform-level permissions
    { code: 'businesses:read', name: 'View Businesses', description: 'View all businesses', category: 'platform' },
    { code: 'businesses:create', name: 'Create Businesses', description: 'Register new businesses', category: 'platform' },
    { code: 'businesses:manage', name: 'Manage Businesses', description: 'Update or suspend businesses', category: 'platform' },
    { code: 'platform:read', name: 'View Platform', description: 'Access platform dashboard', category: 'platform' },
    { code: 'platform:settings', name: 'Platform Settings', description: 'Manage platform configuration', category: 'platform' },
    { code: 'audit:cross-tenant', name: 'Cross-Tenant Audit', description: 'View audit logs across all tenants', category: 'platform' },
    { code: 'users:platform-manage', name: 'Manage Platform Users', description: 'Create or revoke platform admin access', category: 'platform' },
  ]

  const createdPermissions = await Promise.all(
    permissionData.map(p =>
      prisma.permission.upsert({
        where: { code: p.code },
        update: { name: p.name, description: p.description, category: p.category },
        create: p,
      })
    )
  )

  console.log('Created permissions:', createdPermissions.length)

  // ─────────────────────────────────────────────────────────────────────────────
  // IAM: System Roles
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('Creating system roles...')

  const allPermissionCodes = createdPermissions.map(p => p.code)

  const adminPermissionCodes = allPermissionCodes

  const managerPermissionCodes = allPermissionCodes.filter(
    code => !['users:create', 'users:update', 'users:delete', 'users:assign-roles', 'roles:create', 'roles:update', 'roles:delete', 'audit:export'].includes(code)
  )

  const staffPermissionCodes = [
    'menu:read', 'orders:read', 'orders:create', 'orders:update-status',
    'settings:read', 'conversations:read', 'conversations:send',
    'business:read', 'users:read', 'roles:read'
  ]

  let adminRole = await prisma.role.findFirst({ where: { name: 'Admin', isSystem: true } })
  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: {
        name: 'Admin',
        description: 'Full system administrator with all permissions',
        isSystem: true,
      },
    })
  }

  let managerRole = await prisma.role.findFirst({ where: { name: 'Manager', isSystem: true } })
  if (!managerRole) {
    managerRole = await prisma.role.create({
      data: {
        name: 'Manager',
        description: 'Business manager with most permissions except user/role management and audit export',
        isSystem: true,
      },
    })
  }

  let staffRole = await prisma.role.findFirst({ where: { name: 'Staff', isSystem: true } })
  if (!staffRole) {
    staffRole = await prisma.role.create({
      data: {
        name: 'Staff',
        description: 'Basic staff access for menu, orders, and conversations',
        isSystem: true,
      },
    })
  }

  let platformAdminRole = await prisma.role.findFirst({ where: { name: 'Platform Admin', isSystem: true } })
  if (!platformAdminRole) {
    platformAdminRole = await prisma.role.create({
      data: {
        name: 'Platform Admin',
        description: 'Super-administrator with cross-tenant platform access',
        isSystem: true,
      },
    })
  }

  console.log('Created system roles: Admin, Manager, Staff, Platform Admin')

  // Link permissions to roles
  const platformPermissionCodes = createdPermissions.filter(p => p.category === 'platform').map(p => p.code)
  const allPlusPlatform = [...allPermissionCodes, ...platformPermissionCodes]

  for (const code of allPlusPlatform) {
    const perm = createdPermissions.find(p => p.code === code)
    if (perm) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: platformAdminRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: platformAdminRole.id, permissionId: perm.id },
      })
    }
  }

  for (const code of adminPermissionCodes) {
    const perm = createdPermissions.find(p => p.code === code)
    if (perm) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: adminRole.id, permissionId: perm.id },
      })
    }
  }

  for (const code of managerPermissionCodes) {
    const perm = createdPermissions.find(p => p.code === code)
    if (perm) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: managerRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: managerRole.id, permissionId: perm.id },
      })
    }
  }

  for (const code of staffPermissionCodes) {
    const perm = createdPermissions.find(p => p.code === code)
    if (perm) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: staffRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: staffRole.id, permissionId: perm.id },
      })
    }
  }

  console.log('Linked permissions to roles')

  // ─────────────────────────────────────────────────────────────────────────────
  // IAM: Demo Users
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('Creating demo users...')

  const adminPasswordHash = await hashPassword('Admin123!')
  const managerPasswordHash = await hashPassword('Manager123!')
  const staffPasswordHash = await hashPassword('Staff123!')

  const adminUser = await prisma.user.upsert({
    where: { businessId_email: { businessId: business.id, email: 'admin@al-baraka.com' } },
    update: {},
    create: {
      businessId: business.id,
      email: 'admin@al-baraka.com',
      passwordHash: adminPasswordHash,
      name: 'Admin User',
      isActive: true,
    },
  })

  const managerUser = await prisma.user.upsert({
    where: { businessId_email: { businessId: business.id, email: 'manager@al-baraka.com' } },
    update: {},
    create: {
      businessId: business.id,
      email: 'manager@al-baraka.com',
      passwordHash: managerPasswordHash,
      name: 'Manager User',
      isActive: true,
    },
  })

  const staffUser = await prisma.user.upsert({
    where: { businessId_email: { businessId: business.id, email: 'staff@al-baraka.com' } },
    update: {},
    create: {
      businessId: business.id,
      email: 'staff@al-baraka.com',
      passwordHash: staffPasswordHash,
      name: 'Staff User',
      isActive: true,
    },
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Platform Admin User (businessId = null)
  // ─────────────────────────────────────────────────────────────────────────────
  const platformPasswordHash = await hashPassword('PlatformAdmin123!')

  let platformUser = await prisma.user.findFirst({
    where: { email: 'admin@platform.com', businessId: null },
  })

  if (!platformUser) {
    platformUser = await prisma.user.create({
      data: {
        businessId: null,
        email: 'admin@platform.com',
        passwordHash: platformPasswordHash,
        name: 'Platform Admin',
        isActive: true,
      },
    })
  }

  console.log('Created platform admin: admin@platform.com / PlatformAdmin123!')

  // Link platform user to Platform Admin role
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: platformUser.id, roleId: platformAdminRole!.id } },
    update: {},
    create: { userId: platformUser.id, roleId: platformAdminRole!.id },
  })

  console.log('Created demo users: admin@al-baraka.com, manager@al-baraka.com, staff@al-baraka.com')
  console.log('  - admin@platform.com / PlatformAdmin123! (Platform Admin role)')

  // Link users to roles
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  })

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: managerUser.id, roleId: managerRole.id } },
    update: {},
    create: { userId: managerUser.id, roleId: managerRole.id },
  })

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: staffUser.id, roleId: staffRole.id } },
    update: {},
    create: { userId: staffUser.id, roleId: staffRole.id },
  })

  console.log('Linked users to roles')

  console.log('\n✅ IAM seed completed successfully!')
  console.log('Demo credentials:')
  console.log('  - admin@al-baraka.com / Admin123! (Admin role)')
  console.log('  - manager@al-baraka.com / Manager123! (Manager role)')
  console.log('  - staff@al-baraka.com / Staff123! (Staff role)')
  console.log('  - API Key: demo-api-key-123')

  // Create categories
  const categories = await Promise.all([
    prisma.menuCategory.create({
      data: { businessId: business.id, name: 'Sandwiches', nameAr: 'سندويتشات', sortOrder: 1 },
    }),
    prisma.menuCategory.create({
      data: { businessId: business.id, name: 'Meals', nameAr: 'وجبات', sortOrder: 2 },
    }),
    prisma.menuCategory.create({
      data: { businessId: business.id, name: 'Sides', nameAr: 'مقبلات', sortOrder: 3 },
    }),
    prisma.menuCategory.create({
      data: { businessId: business.id, name: 'Drinks', nameAr: 'مشروبات', sortOrder: 4 },
    }),
    prisma.menuCategory.create({
      data: { businessId: business.id, name: 'Desserts', nameAr: 'حلويات', sortOrder: 5 },
    }),
  ])

  console.log('Created categories:', categories.length)

  // Create menu items for Sandwiches
  await Promise.all([
    prisma.menuItem.create({
      data: { name: 'Shawarma Chicken', nameAr: 'شاورما دجاج', basePrice: 5, categoryId: categories[0].id },
    }),
    prisma.menuItem.create({
      data: { name: 'Shawarma Meat', nameAr: 'شاورما لحم', basePrice: 6, categoryId: categories[0].id },
    }),
    prisma.menuItem.create({
      data: { name: 'Falafel Wrap', nameAr: 'فلافل', basePrice: 4, categoryId: categories[0].id },
    }),
  ])

  // Create menu items for Meals
  await Promise.all([
    prisma.menuItem.create({
      data: { name: 'Grilled Chicken Plate', nameAr: 'وجيه مشوي', basePrice: 12, categoryId: categories[1].id },
    }),
    prisma.menuItem.create({
      data: { name: 'Mixed Grill', nameAr: 'مشويات مشكلة', basePrice: 18, categoryId: categories[1].id },
    }),
    prisma.menuItem.create({
      data: { name: 'Kabsa', nameAr: 'كبسة', basePrice: 10, categoryId: categories[1].id },
    }),
  ])

  // Create menu items for Sides
  await Promise.all([
    prisma.menuItem.create({
      data: { name: 'Hummus', nameAr: 'حمص', basePrice: 3, categoryId: categories[2].id },
    }),
    prisma.menuItem.create({
      data: { name: 'Fattoush Salad', nameAr: 'فتوش', basePrice: 4, categoryId: categories[2].id },
    }),
    prisma.menuItem.create({
      data: { name: 'French Fries', nameAr: 'بطاطس', basePrice: 3, categoryId: categories[2].id },
    }),
  ])

  // Create menu items for Drinks
  await Promise.all([
    prisma.menuItem.create({
      data: { name: 'Pepsi', nameAr: 'بيبسي', basePrice: 1.5, categoryId: categories[3].id },
    }),
    prisma.menuItem.create({
      data: { name: 'Lemon Mint', nameAr: 'ليمون بالنعناع', basePrice: 3, categoryId: categories[3].id },
    }),
    prisma.menuItem.create({
      data: { name: 'Arabic Coffee', nameAr: 'قهوة عربية', basePrice: 2, categoryId: categories[3].id },
    }),
  ])

  // Create menu items for Desserts
  await Promise.all([
    prisma.menuItem.create({
      data: { name: 'Kunafa', nameAr: 'كنافة', basePrice: 5, categoryId: categories[4].id },
    }),
    prisma.menuItem.create({
      data: { name: 'Baklava', nameAr: 'بقلاوة', basePrice: 4, categoryId: categories[4].id },
    }),
  ])

  console.log('Created menu items: 14')

  // Create restaurant settings
  await prisma.restaurantSettings.upsert({
    where: { businessId: business.id },
    update: {},
    create: {
      businessId: business.id,
      name: 'Al-Baraka Restaurant',
      openingTime: '09:00',
      closingTime: '23:00',
      welcomeMsg: '',
      currency: 'SAR',
      address: 'King Fahd Road, Al-Malaz, Riyadh 12831',
      latitude: 24.6748,
      longitude: 46.6918,
      phoneNumber: '+966500000000',
      deliveryEnabled: true,
      dineInEnabled: true,
      pickupEnabled: true,
      deliveryTiers: '[{"maxKm":3,"fee":5},{"maxKm":7,"fee":10},{"maxKm":10,"fee":15}]',
      maxDeliveryDistanceKm: 10,
      estimatedPrepTimeMinutes: 20,
      paymentMethods: '["cash","card","apple_pay"]',
      isTemporarilyClosed: false,
      defaultLanguage: 'ar',
    },
  })

  console.log('Created restaurant settings')

  console.log('\n✅ Full seed completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

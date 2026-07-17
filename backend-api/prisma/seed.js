"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding database with ACL and Multi-tenant settings...');
    await prisma.rolePermission.deleteMany({});
    await prisma.tenantModule.deleteMany({});
    await prisma.module.deleteMany({});
    await prisma.systemLog.deleteMany({});
    await prisma.emailTemplate.deleteMany({});
    await prisma.leave.deleteMany({});
    await prisma.attendance.deleteMany({});
    await prisma.payroll.deleteMany({});
    await prisma.employee.deleteMany({});
    await prisma.auth.deleteMany({});
    await prisma.company.deleteMany({});
    const passwordHash = bcrypt.hashSync('Password@123', 10);
    await prisma.auth.create({
        data: {
            email: 'super@admin.com',
            passwordHash,
            role: 'super_admin',
        },
    });
    console.log('Created Super Admin');
    const acmeTheme = JSON.stringify({
        primary: '#10b981',
        secondary: '#065f46',
        fontFamily: 'Outfit, sans-serif',
        logoUrl: 'https://placehold.co/150x50/10b981/ffffff?text=Acme+HRMS',
        plan: 'premium',
    });
    const wayneTheme = JSON.stringify({
        primary: '#6366f1',
        secondary: '#3730a3',
        fontFamily: 'Inter, sans-serif',
        logoUrl: 'https://placehold.co/150x50/6366f1/ffffff?text=Wayne+HRMS',
        plan: 'basic',
    });
    const acme = await prisma.company.create({
        data: {
            name: 'Acme Corporation',
            domain: 'acme.com',
            isActive: true,
            status: 'active',
            subscribedModules: 'attendance,payroll,leave',
            themeSettings: acmeTheme,
        },
    });
    const wayne = await prisma.company.create({
        data: {
            name: 'Wayne Enterprises',
            domain: 'wayne.com',
            isActive: true,
            status: 'active',
            subscribedModules: 'attendance,leave',
            themeSettings: wayneTheme,
        },
    });
    const suspended = await prisma.company.create({
        data: {
            name: 'Suspended Corp',
            domain: 'suspended.com',
            isActive: false,
            status: 'active',
            subscribedModules: 'attendance,payroll,leave',
            themeSettings: JSON.stringify({
                primary: '#3b82f6',
                secondary: '#1e3a8a',
                fontFamily: 'Inter, sans-serif',
                logoUrl: '',
                plan: 'premium',
            }),
        },
    });
    const pending = await prisma.company.create({
        data: {
            name: 'Pending Startups',
            domain: 'pending.com',
            isActive: true,
            status: 'pending',
            subscribedModules: 'attendance',
            themeSettings: JSON.stringify({
                primary: '#3b82f6',
                secondary: '#1e3a8a',
                fontFamily: 'Inter, sans-serif',
                logoUrl: '',
                plan: 'basic',
            }),
        },
    });
    console.log('Created Tenants');
    const modAuth = await prisma.module.create({
        data: {
            name: 'auth',
            remoteUrl: 'http://localhost:3001/remoteEntry.js',
            bundleName: 'auth',
            exposedModule: './App',
        },
    });
    const modEmployees = await prisma.module.create({
        data: {
            name: 'employees',
            remoteUrl: 'http://localhost:3002/remoteEntry.js',
            bundleName: 'employees',
            exposedModule: './App',
        },
    });
    const modPayroll = await prisma.module.create({
        data: {
            name: 'payroll',
            remoteUrl: 'http://localhost:3003/remoteEntry.js',
            bundleName: 'payroll',
            exposedModule: './App',
        },
    });
    const modAttendance = await prisma.module.create({
        data: {
            name: 'attendance',
            remoteUrl: 'http://localhost:3004/remoteEntry.js',
            bundleName: 'attendance',
            exposedModule: './App',
        },
    });
    const modLeave = await prisma.module.create({
        data: {
            name: 'leave',
            remoteUrl: 'http://localhost:3000',
            bundleName: 'leave',
            exposedModule: './App',
        },
    });
    console.log('Created Modules catalogue');
    await prisma.tenantModule.createMany({
        data: [
            { tenantId: acme.id, moduleId: modAuth.id, status: 'active' },
            { tenantId: acme.id, moduleId: modEmployees.id, status: 'active' },
            { tenantId: acme.id, moduleId: modPayroll.id, status: 'pending' },
            { tenantId: acme.id, moduleId: modAttendance.id, status: 'active' },
            { tenantId: acme.id, moduleId: modLeave.id, status: 'active' },
        ],
    });
    await prisma.tenantModule.createMany({
        data: [
            { tenantId: wayne.id, moduleId: modAuth.id },
            { tenantId: wayne.id, moduleId: modEmployees.id },
            { tenantId: wayne.id, moduleId: modAttendance.id },
            { tenantId: wayne.id, moduleId: modLeave.id },
        ],
    });
    console.log('Linked Modules to Tenants');
    await prisma.rolePermission.createMany({
        data: [
            { role: 'tenant_admin', permission: 'admin', moduleId: modEmployees.id },
            { role: 'tenant_admin', permission: 'admin', moduleId: modPayroll.id },
            { role: 'tenant_admin', permission: 'admin', moduleId: modAttendance.id },
            { role: 'tenant_admin', permission: 'admin', moduleId: modLeave.id },
            { role: 'employee', permission: 'read', moduleId: modEmployees.id },
            { role: 'employee', permission: 'read', moduleId: modPayroll.id },
            { role: 'employee', permission: 'write', moduleId: modAttendance.id },
            { role: 'employee', permission: 'write', moduleId: modLeave.id },
        ],
    });
    console.log('Created Role Permissions');
    const adminAcme = await prisma.auth.create({
        data: {
            email: 'admin@acme.com',
            passwordHash,
            role: 'tenant_admin',
            tenantId: acme.id,
        },
    });
    const adminWayne = await prisma.auth.create({
        data: {
            email: 'admin@wayne.com',
            passwordHash,
            role: 'tenant_admin',
            tenantId: wayne.id,
        },
    });
    const adminSuspended = await prisma.auth.create({
        data: {
            email: 'admin@suspended.com',
            passwordHash,
            role: 'tenant_admin',
            tenantId: suspended.id,
        },
    });
    console.log('Created Tenant Admins');
    const emp1 = await prisma.employee.create({
        data: {
            employeeCode: 'EMP-ACME-01',
            firstName: 'Aarav',
            lastName: 'Sharma',
            email: 'aarav@acme.com',
            department: 'Engineering',
            designation: 'Senior Developer',
            tenantId: acme.id,
        },
    });
    const emp2 = await prisma.employee.create({
        data: {
            employeeCode: 'EMP-ACME-02',
            firstName: 'Priya',
            lastName: 'Patel',
            email: 'priya@acme.com',
            department: 'HR',
            designation: 'HR Lead',
            tenantId: acme.id,
        },
    });
    const emp3 = await prisma.employee.create({
        data: {
            employeeCode: 'EMP-WAYNE-01',
            firstName: 'Bruce',
            lastName: 'Wayne',
            email: 'bruce@wayne.com',
            department: 'Management',
            designation: 'CEO',
            tenantId: wayne.id,
        },
    });
    console.log('Created Employees');
    await prisma.auth.create({
        data: {
            email: 'aarav@acme.com',
            passwordHash,
            role: 'employee',
            tenantId: acme.id,
        },
    });
    await prisma.auth.create({
        data: {
            email: 'priya@acme.com',
            passwordHash,
            role: 'employee',
            tenantId: acme.id,
        },
    });
    await prisma.auth.create({
        data: {
            email: 'bruce@wayne.com',
            passwordHash,
            role: 'employee',
            tenantId: wayne.id,
        },
    });
    console.log('Created Employee Auth Credentials');
    const checkIn = new Date();
    checkIn.setHours(9, 0, 0, 0);
    const checkOut = new Date();
    checkOut.setHours(17, 30, 0, 0);
    await prisma.attendance.create({
        data: {
            employeeId: emp1.id,
            checkIn,
            checkOut,
            status: 'present',
            notes: 'On-time check-in',
            tenantId: acme.id,
        },
    });
    await prisma.attendance.create({
        data: {
            employeeId: emp2.id,
            checkIn,
            status: 'present',
            notes: 'No check-out yet',
            tenantId: acme.id,
        },
    });
    await prisma.attendance.create({
        data: {
            employeeId: emp3.id,
            checkIn,
            checkOut,
            status: 'present',
            notes: 'Wayne Enterprises CEO',
            tenantId: wayne.id,
        },
    });
    console.log('Created Attendance records');
    await prisma.payroll.create({
        data: {
            employeeId: emp1.id,
            period: new Date(2026, 6, 1),
            grossAmount: 85000,
            deductions: 5000,
            netAmount: 80000,
            status: 'paid',
            tenantId: acme.id,
        },
    });
    await prisma.payroll.create({
        data: {
            employeeId: emp2.id,
            period: new Date(2026, 6, 1),
            grossAmount: 70000,
            deductions: 4000,
            netAmount: 66000,
            status: 'draft',
            tenantId: acme.id,
        },
    });
    console.log('Created Payroll records');
    await prisma.leave.create({
        data: {
            employeeId: emp1.id,
            startDate: new Date(2026, 7, 10),
            endDate: new Date(2026, 7, 12),
            status: 'approved',
            type: 'annual',
            tenantId: acme.id,
        },
    });
    await prisma.leave.create({
        data: {
            employeeId: emp2.id,
            startDate: new Date(2026, 7, 20),
            endDate: new Date(2026, 7, 21),
            status: 'pending',
            type: 'sick',
            tenantId: acme.id,
        },
    });
    console.log('Created Leave records');
    await prisma.emailTemplate.createMany({
        data: [
            {
                name: 'tenant_invitation',
                subject: 'Welcome to HRMS! Your tenant invitation details',
                body: 'Hello,\n\nYour organization has been registered on HRMS.\nEmail: {{email}}\nTemporary Password: {{password}}\n\nPlease login and change your password immediately.',
            },
            {
                name: 'leave_status_update',
                subject: 'Leave Application Status Updated',
                body: 'Hello {{name}},\n\nYour leave application from {{startDate}} to {{endDate}} has been {{status}}.\n\nBest regards,\nHR Team',
            },
        ],
    });
    console.log('Created Email Templates');
    await prisma.systemLog.createMany({
        data: [
            {
                action: 'PLATFORM_INIT',
                details: 'System seeding and initialization completed.',
            },
        ],
    });
    console.log('Created System Logs');
    console.log('Database seeding completed successfully!');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map
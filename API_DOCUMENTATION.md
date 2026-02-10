# Project & Business Management API Documentation

## Overview

Complete backend implementation for Project and Business management with file upload support, status management, and proper relations.

---

## 🗂️ Database Models

### Project Model

```typescript
{
  id: string (UUID)
  userId: string // User who created the project
  businessId?: string // Optional link to Business
  clientName: string
  projectName: string
  taskTitle: string
  description?: string
  attachments: Json[] // Array of file URLs
  status: ProjectStatus // pending, accepted, rejected, in_progress, completed, cancelled
  createdAt: DateTime
  updatedAt: DateTime
}
```

### Business Model

```typescript
{
  id: string (UUID)
  userId: string // User who created the business
  businessName: string
  industry?: string
  taskTitle: string
  description?: string
  attachments: Json[] // Array of file URLs
  status: BusinessStatus // pending, accepted, rejected, in_progress, completed, cancelled
  createdAt: DateTime
  updatedAt: DateTime
  projects: Project[] // Related projects
}
```

---

## 📋 PROJECT API ENDPOINTS

### Base URL: `/projects`

### 1. Upload Project Attachments

**POST** `/projects/upload-attachments`

**Content-Type:** `multipart/form-data`

**Body:**

```
attachments: File[] (max 10 files, images/PDFs only, max 10MB each)
```

**Response:**

```json
{
  "files": [
    {
      "filename": "1234567890-document.pdf",
      "path": "public/uploads/1234567890-document.pdf",
      "url": "/uploads/1234567890-document.pdf"
    }
  ]
}
```

---

### 2. Create Project

**POST** `/projects`

**Body:**

```json
{
  "userId": "user-uuid",
  "businessId": "business-uuid", // Optional
  "clientName": "ABC Company",
  "projectName": "Website Redesign",
  "taskTitle": "Update UI/UX",
  "description": "Redesign the company website with modern UI",
  "attachments": ["/uploads/file1.pdf", "/uploads/image1.jpg"]
}
```

**Response:**

```json
{
  "id": "project-uuid",
  "userId": "user-uuid",
  "businessId": "business-uuid",
  "clientName": "ABC Company",
  "projectName": "Website Redesign",
  "taskTitle": "Update UI/UX",
  "description": "Redesign the company website with modern UI",
  "attachments": ["/uploads/file1.pdf", "/uploads/image1.jpg"],
  "status": "pending",
  "createdAt": "2026-01-01T...",
  "updatedAt": "2026-01-01T...",
  "business": { ... }
}
```

---

### 3. Get All Projects (with filters)

**GET** `/projects?userId=xxx&status=pending&page=1&perPage=10`

**Query Parameters:**

- `userId` (optional): Filter by user
- `status` (optional): Filter by status (pending/accepted/rejected/in_progress/completed/cancelled)
- `page` (optional, default: 1): Page number
- `perPage` (optional, default: 10): Items per page

**Response:**

```json
{
  "data": [
    {
      "id": "project-uuid",
      "userId": "user-uuid",
      "clientName": "ABC Company",
      "projectName": "Website Redesign",
      "taskTitle": "Update UI/UX",
      "status": "pending",
      "createdAt": "2026-01-01T...",
      "business": { ... }
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "perPage": 10,
    "totalPages": 5
  }
}
```

---

### 4. Get Projects by User

**GET** `/projects/user/:userId`

**Response:**

```json
[
  {
    "id": "project-uuid",
    "userId": "user-uuid",
    "clientName": "ABC Company",
    "projectName": "Website Redesign",
    "status": "pending",
    "createdAt": "2026-01-01T...",
    "business": { ... }
  }
]
```

---

### 5. Get Projects by Business

**GET** `/projects/business/:businessId`

**Response:** Array of projects belonging to that business

---

### 6. Get Single Project

**GET** `/projects/:id`

**Response:**

```json
{
  "id": "project-uuid",
  "userId": "user-uuid",
  "businessId": "business-uuid",
  "clientName": "ABC Company",
  "projectName": "Website Redesign",
  "taskTitle": "Update UI/UX",
  "description": "Redesign the company website",
  "attachments": ["/uploads/file1.pdf"],
  "status": "pending",
  "createdAt": "2026-01-01T...",
  "updatedAt": "2026-01-01T...",
  "business": { ... }
}
```

---

### 7. Update Project

**PATCH** `/projects/:id`

**Body:** (All fields optional)

```json
{
  "clientName": "Updated Client Name",
  "projectName": "Updated Project Name",
  "taskTitle": "Updated Task",
  "description": "Updated description",
  "businessId": "new-business-uuid",
  "attachments": ["/uploads/new-file.pdf"]
}
```

**Response:** Updated project object

---

### 8. Update Project Status

**PATCH** `/projects/:id/status`

**Body:**

```json
{
  "status": "accepted" // pending | accepted | rejected | in_progress | completed | cancelled
}
```

**Response:** Updated project object with new status

---

### 9. Delete Project

**DELETE** `/projects/:id`

**Response:**

```json
{
  "message": "Project deleted successfully"
}
```

---

## 💼 BUSINESS API ENDPOINTS

### Base URL: `/business`

### 1. Upload Business Attachments

**POST** `/business/upload-attachments`

**Content-Type:** `multipart/form-data`

**Body:**

```
attachments: File[] (max 10 files, images/PDFs only, max 10MB each)
```

**Response:**

```json
{
  "files": [
    {
      "filename": "1234567890-document.pdf",
      "path": "public/uploads/1234567890-document.pdf",
      "url": "/uploads/1234567890-document.pdf"
    }
  ]
}
```

---

### 2. Create Business

**POST** `/business`

**Body:**

```json
{
  "userId": "user-uuid",
  "businessName": "Tech Solutions Inc",
  "industry": "Technology",
  "taskTitle": "Setup New Business",
  "description": "Launch new technology business",
  "attachments": ["/uploads/file1.pdf", "/uploads/image1.jpg"]
}
```

**Response:**

```json
{
  "id": "business-uuid",
  "userId": "user-uuid",
  "businessName": "Tech Solutions Inc",
  "industry": "Technology",
  "taskTitle": "Setup New Business",
  "description": "Launch new technology business",
  "attachments": ["/uploads/file1.pdf"],
  "status": "pending",
  "createdAt": "2026-01-01T...",
  "updatedAt": "2026-01-01T...",
  "projects": []
}
```

---

### 3. Get All Businesses (with filters)

**GET** `/business?userId=xxx&status=pending&page=1&perPage=10`

**Query Parameters:**

- `userId` (optional): Filter by user
- `status` (optional): Filter by status
- `page` (optional, default: 1)
- `perPage` (optional, default: 10)

**Response:**

```json
{
  "data": [
    {
      "id": "business-uuid",
      "userId": "user-uuid",
      "businessName": "Tech Solutions Inc",
      "industry": "Technology",
      "status": "pending",
      "createdAt": "2026-01-01T...",
      "projects": [...]
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "perPage": 10,
    "totalPages": 3
  }
}
```

---

### 4. Get Businesses by User

**GET** `/business/user/:userId`

**Response:** Array of businesses created by that user (includes related projects)

---

### 5. Get Single Business

**GET** `/business/:id`

**Response:**

```json
{
  "id": "business-uuid",
  "userId": "user-uuid",
  "businessName": "Tech Solutions Inc",
  "industry": "Technology",
  "taskTitle": "Setup New Business",
  "description": "Launch new technology business",
  "attachments": ["/uploads/file1.pdf"],
  "status": "pending",
  "createdAt": "2026-01-01T...",
  "updatedAt": "2026-01-01T...",
  "projects": [
    {
      "id": "project-uuid",
      "projectName": "Website Development",
      "status": "in_progress",
      ...
    }
  ]
}
```

---

### 6. Update Business

**PATCH** `/business/:id`

**Body:** (All fields optional)

```json
{
  "businessName": "Updated Business Name",
  "industry": "Updated Industry",
  "taskTitle": "Updated Task",
  "description": "Updated description",
  "attachments": ["/uploads/new-file.pdf"]
}
```

**Response:** Updated business object

---

### 7. Update Business Status

**PATCH** `/business/:id/status`

**Body:**

```json
{
  "status": "accepted" // pending | accepted | rejected | in_progress | completed | cancelled
}
```

**Response:** Updated business object with new status

---

### 8. Delete Business

**DELETE** `/business/:id`

**Response:**

```json
{
  "message": "Business deleted successfully"
}
```

---

## 📤 File Upload Workflow

### Step 1: Upload Files

```javascript
// Upload attachments first
const formData = new FormData();
formData.append('attachments', file1);
formData.append('attachments', file2);

const uploadResponse = await fetch(
  'http://localhost:3000/projects/upload-attachments',
  {
    method: 'POST',
    body: formData,
  },
);

const { files } = await uploadResponse.json();
// files = [{ filename: '...', path: '...', url: '/uploads/...' }]
```

### Step 2: Create Project/Business with URLs

```javascript
// Use the URLs from upload response
const attachmentUrls = files.map((f) => f.url);

const createResponse = await fetch('http://localhost:3000/projects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-uuid',
    clientName: 'ABC Company',
    projectName: 'New Project',
    taskTitle: 'Task Title',
    description: 'Description',
    attachments: attachmentUrls, // Use uploaded file URLs
  }),
});
```

---

## 🔄 Status Flow

### Available Statuses:

1. **pending** - Initial state when created (default)
2. **accepted** - Approved by admin/manager
3. **rejected** - Declined by admin/manager
4. **in_progress** - Work is ongoing
5. **completed** - Task finished
6. **cancelled** - Cancelled by user or admin

### Typical Flow:

```
pending → accepted → in_progress → completed
         ↓
      rejected
         ↓
      cancelled
```

---

## 🔗 Relations

### Project-Business Relationship:

- A **Project** can optionally belong to a **Business** (via `businessId`)
- A **Business** can have multiple **Projects**
- When you fetch a Business, it includes all related Projects
- When you fetch a Project, it includes the related Business (if any)

### User Relationship:

- Both Project and Business store the `userId` of the creator
- You can query all projects/businesses by a specific user
- User data is NOT automatically included (add User relation in schema if needed)

---

## 🎯 Frontend Integration Example

### React Native (AddProject.js)

```javascript
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DocumentPicker from 'react-native-document-picker';

const AddProject = () => {
  const [clientName, setClientName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Pick files
  const handlePickFiles = async () => {
    try {
      const results = await DocumentPicker.pick({
        type: [DocumentPicker.types.images, DocumentPicker.types.pdf],
        allowMultiSelection: true,
      });

      // Upload files
      const formData = new FormData();
      results.forEach(file => {
        formData.append('attachments', {
          uri: file.uri,
          type: file.type,
          name: file.name,
        });
      });

      const uploadRes = await fetch('http://your-api.com/projects/upload-attachments', {
        method: 'POST',
        body: formData,
      });

      const { files } = await uploadRes.json();
      setAttachments(files.map(f => f.url));
    } catch (err) {
      console.error('File upload error:', err);
    }
  };

  // Submit project
  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Get logged-in user ID
      const userId = await AsyncStorage.getItem('userId');

      const response = await fetch('http://your-api.com/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          clientName,
          projectName,
          taskTitle,
          description,
          attachments,
        }),
      });

      const project = await response.json();
      Alert.alert('Success', 'Project created successfully!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Your UI components here
  );
};
```

### React Native (AddBusiness.js)

```javascript
const AddBusiness = () => {
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userProjects, setUserProjects] = useState([]);

  // Fetch user's businesses (for dropdown)
  const fetchUserBusinesses = async (userId) => {
    const response = await fetch(`http://your-api.com/business/user/${userId}`);
    const businesses = await response.json();
    return businesses;
  };

  // When user is selected, fetch their projects
  const handleUserSelect = async (userId) => {
    setSelectedUser(userId);
    const response = await fetch(`http://your-api.com/projects/user/${userId}`);
    const projects = await response.json();
    setUserProjects(projects);
  };

  // Submit business
  const handleSubmit = async () => {
    const userId = await AsyncStorage.getItem('userId');

    const response = await fetch('http://your-api.com/business', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        businessName,
        industry,
        taskTitle,
        description,
        attachments,
      }),
    });

    const business = await response.json();
    Alert.alert('Success', 'Business created successfully!');
  };

  return (
    // Your UI with dropdowns for user selection and project display
  );
};
```

---

## ✅ Testing with Postman/Thunder Client

### 1. Test File Upload

```
POST http://localhost:3000/projects/upload-attachments
Body: form-data
  - Key: attachments (File)
  - Value: Select file(s)
```

### 2. Test Create Project

```
POST http://localhost:3000/projects
Body: raw JSON
{
  "userId": "paste-user-uuid-here",
  "clientName": "Test Client",
  "projectName": "Test Project",
  "taskTitle": "Test Task",
  "description": "Test description",
  "attachments": ["/uploads/1234567890-file.pdf"]
}
```

### 3. Test Get All Projects

```
GET http://localhost:3000/projects
GET http://localhost:3000/projects?userId=user-uuid
GET http://localhost:3000/projects?status=pending
```

### 4. Test Update Status

```
PATCH http://localhost:3000/projects/{project-id}/status
Body: raw JSON
{
  "status": "accepted"
}
```

---

## 🚀 Deployment Notes

1. **Environment Variables:** Ensure `DATABASE_URL` is set in `.env`
2. **File Storage:** Files are stored in `public/uploads/` directory
3. **File Access:** Files accessible via `/uploads/{filename}`
4. **CORS:** Make sure CORS is enabled for your frontend domain
5. **Max File Size:** Default 10MB per file (configurable in multer.config.ts)
6. **Supported Files:** JPG, JPEG, PNG, PDF, DOCX

---

## 📝 Notes

- Default status for all new records is `pending`
- Status can only be updated via the `/status` endpoint
- File uploads are separate from entity creation for better error handling
- Pagination is available for list endpoints
- All IDs are UUIDs
- Soft delete is not implemented (actual DELETE)
- No authentication guards are active (uncomment in controllers if needed)

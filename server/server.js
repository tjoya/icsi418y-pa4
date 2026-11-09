require("dotenv").config();
const { MongoClient, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const client = new MongoClient(process.env.MONGO_URI);
const app = express();

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => 
{
    res.json({
        message: "Server is running"
    });
});

app.post("/signup", async (req, res) => 
{
    const { firstName, lastName, username, password } = req.body;

    if (!firstName || !lastName || !username || !password) 
    {
        return res.status(400).json({
            message: "Missing: Required information."
        });
    }

    try {
        const db = client.db("pa2");
        const users = db.collection("users");

        const existingUser = await users.findOne({ username: username });

        if (existingUser !== null) 
        {
            return res.status(409).json({
                message: "Username already exists!"
            });
        }

        await users.insertOne({
            f_name: firstName,
            l_name: lastName,
            username: username,
            password: password
        });

        res.status(201).json({
            message: "User created successfully!"
        });
    }
    catch (error) 
    {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});

app.post("/login", async (req, res) => 
{
    const { username, password } = req.body;

    if (!username || !password) 
    {
        return res.status(400).json({
            message: "Missing: Required information."
        });
    }

    try 
    {
        const db = client.db("pa2");
        const users = db.collection("users");

        const user = await users.findOne({ username: username });

        if (user === null) 
        {
            return res.status(401).json({
                message: "Invalid username or password."
            });
        }
        if (user.password !== password) 
        {
            return res.status(401).json({
                message: "Invalid username or password."
            });
        }

        res.status(200).json({
            message: "Login successful!",
            user: 
            {
                f_name: user.f_name,
                l_name: user.l_name,
                username: user.username,
                password: user.password
            }
        });
    }
    catch (error) 
    {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});

app.get("/users", async (req, res) => 
    {
    try 
    {
        const db = client.db("pa2");
        const users = db.collection("users");

        const allUsers = await users.find(
            {},
            { projection: { password: 0 } }
        ).toArray();

        res.status(200).json(allUsers);
    }
    catch (error) 
    {
        console.error(error);

        res.status(500).json({
            message: "Server error."
        });
    }
});


app.post("/projects", async (req, res) => 
{
    const { name, description, status, project_lead_id } = req.body;

    if (!name?.trim() || !description?.trim() ||
        !["Planning", "Active", "Completed"].includes(status) ||
        !project_lead_id) 
        {
        return res.status(400).json({
            message: "Missing project information."
        });
    }

    if (!ObjectId.isValid(project_lead_id)) 
    {
        return res.status(400).json({
            message: "Invalid Project Lead."
        });
    }

    try 
    {
        const db = client.db("pa2");
        const users = db.collection("users");
        const projects = db.collection("Projects");
        const memberships = db.collection("ProjectMemberships");

        const leadId = new ObjectId(project_lead_id);

        const lead = await users.findOne({ _id: leadId });

        if (lead === null) 
        {
            return res.status(404).json({
                message: "Project Lead does not exist."
            });
        }

        const result = await projects.insertOne({
            name: name.trim(),
            description: description.trim(),
            status: status,
            project_lead_id: leadId
        });

        await memberships.insertOne({
            project_id: result.insertedId,
            user_id: leadId
        });

        res.status(201).json({
            message: "Project created successfully!",
            project_id: result.insertedId
        });
    }
    catch (error) 
    {
        console.error(error);

        res.status(500).json({
            message: "Server errorr."
        });
    }
});


app.delete("/projects/:projectId/members/:userId", async (req, res) => 
{
    const { projectId, userId } = req.params;

    if (!ObjectId.isValid(projectId) || !ObjectId.isValid(userId)) 
    {
        return res.status(400).json({
            message: "Invalid Project ID or User ID."
        });
    }

    try 
    {
        const db = client.db("pa2");
        const projects = db.collection("Projects");
        const users = db.collection("users");
        const memberships = db.collection("ProjectMemberships");
        const stories = db.collection("UserStories");
        const projectObjectId = new ObjectId(projectId);
        const userObjectId = new ObjectId(userId);

        const project = await projects.findOne({
            _id: projectObjectId
        });

        if (project === null) 
        {
            return res.status(404).json({
                message: "Project does not exist."
            });
        }

        const user = await users.findOne({
            _id: userObjectId
        });

        if (user === null) 
        {
            return res.status(404).json({
                message: "The user does not exist."
            });
        }

        if (project.project_lead_id.equals(userObjectId)) 
        {
            return res.status(403).json({
                message: "Project Lead cannot be removed."
            });
        }


        const assignedStory = await stories.findOne({
            project_id: projectObjectId,
            assigned_user_id: userObjectId
        });

        if (assignedStory !== null)
        {
            return res.status(400).json({message: "Member has been assigned stories. Reassign or unassign or delete the stories before removing member."});
        }

        const result = await memberships.deleteOne({
            project_id: projectObjectId,
            user_id: userObjectId
        });

        if (result.deletedCount === 0) 
        {
            return res.status(404).json({
                message: "The user is not a member of this project."
            });
        }

        res.status(200).json({
            message: "Member has been removed successfully!"
        });
    }
    catch (error) 
    {
        console.error(error);

        res.status(500).json({
            message: "Server error."
        });
    }
});

async function connectDatabase() 
{
    try {
        await client.connect();
        console.log("Connected to MongoDB");
    }
    catch (error) {
        console.error("Not connected to MongoDB");
        console.error(error);
    }
}

app.get("/projects", async (req, res) => 
    {
    try 
    {
        const db = client.db("pa2");
        const projects = db.collection("Projects");
        const users = db.collection("users");

        const allProjects = await projects.find({}).toArray();

        for (const project of allProjects) 
        {
            const lead = await users.findOne({
                _id: project.project_lead_id
            });

            if (lead !== null) 
            {
                project.project_lead_name =
                    lead.f_name + " " + lead.l_name;
            }
            else 
            {
                project.project_lead_name = "Unknown";
            }
        }

        res.status(200).json(allProjects);
    }
    catch (error) 
    {
        console.error(error);

        res.status(500).json({
            message: "Server error."
        });
    }
});

app.get("/projects/:projectId/members", async (req, res) => 
{
    const { projectId } = req.params;

    if (!ObjectId.isValid(projectId)) 
    {
        return res.status(400).json({
            message: "Invalid Project ID."
        });
    }

    try 
    {
        const db = client.db("pa2");
        const projects = db.collection("Projects");
        const memberships = db.collection("ProjectMemberships");
        const users = db.collection("users");

        const project = await projects.findOne({
            _id: new ObjectId(projectId)
        });

        if (project === null) 
        {
            return res.status(404).json({
                message: "Project does not exist."
            });
        }

        const projectMembers = await memberships.find({
            project_id: new ObjectId(projectId)
        }).toArray();

        const members = [];

        for (const membership of projectMembers) 
        {
            const user = await users.findOne({
                _id: membership.user_id
            });

            if (user !== null) 
            {
                members.push({
                    _id: user._id,
                    name: user.f_name + " " + user.l_name,
                    username: user.username,
                    isLead: user._id.equals(project.project_lead_id)
                });
            }
        }

        res.status(200).json(members);
    }
    catch (error) 
    {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});

app.post("/projects/:projectId/members", async (req, res) => 
{
    const { projectId } = req.params;
    const { user_id } = req.body;

    if (!ObjectId.isValid(projectId) || !ObjectId.isValid(user_id)) 
    {
        return res.status(400).json({
            message: "Invalid Project ID or User ID."
        });
    }

    try 
    {
        const db = client.db("pa2");
        const projects = db.collection("Projects");
        const users = db.collection("users");
        const memberships = db.collection("ProjectMemberships");

        const projectObjectId = new ObjectId(projectId);
        const userObjectId = new ObjectId(user_id);

        const project = await projects.findOne({
            _id: projectObjectId
        });

        if (project === null) 
        {
            return res.status(404).json({
                message: "Project does not exist."
            });
        }

        const user = await users.findOne({
            _id: userObjectId
        });

        if (user === null) 
        {
            return res.status(404).json({
                message: "User does not exist."
            });
        }

        const existingMembership = await memberships.findOne({
            project_id: projectObjectId,
            user_id: userObjectId
        });

        if (existingMembership !== null) 
        {
            return res.status(409).json({
                message: "User is already amember of this project."
            });
        }

        await memberships.insertOne({
            project_id: projectObjectId,
            user_id: userObjectId
        });

        res.status(201).json({
            message: "Member has been added successfully!"
        });
    }
    catch (error) 
    {
        console.error(error);

        res.status(500).json({
            message: "Server error."
        });
    }
});

app.get("/projects/:projectId/stories", async (req, res) =>
{
    const { projectId } = req.params;

    if (!ObjectId.isValid(projectId))
    {
        return res.status(400).json({message: "Invalid Project ID."});
    }

    try
    {
        const db = client.db("pa2");
        const projects = db.collection("Projects");
        const stories = db.collection("UserStories");
        const users = db.collection("users");
        const projectObjectId = new ObjectId(projectId);
        const project = await projects.findOne({_id: projectObjectId});

        if (project === null)
        {
            return res.status(404).json({message: "Project does not exist."});
        }

        const projectStories = await stories.find({project_id: projectObjectId}).toArray();

        for (const story of projectStories)
        {
            story.assigned_member_name = "Unassigned";

            if (story.assigned_user_id !== null)
            {
                const user = await users.findOne({
                    _id: story.assigned_user_id
                });

                if (user !== null)
                {
                    story.assigned_member_name = user.f_name + " " + user.l_name;
                }
            }
        }

        res.status(200).json(projectStories);
    }
    catch (error)
    {
        console.error(error);

        res.status(500).json({message: "Server error."});
    }
});

app.post("/projects/:projectId/stories", async (req, res) =>
{
    const { projectId } = req.params;
    const { title, description, priority, assigned_user_id } = req.body;

    if (!ObjectId.isValid(projectId))
    {
        return res.status(400).json({message: "Invalid Project ID."});
    }

    if (typeof title !== "string" || !title.trim() ||
        typeof description !== "string" || !description.trim() || !["High", "Medium", "Low"].includes(priority))
    {
        return res.status(400).json({message: "Missing or invalid story information."});
    }

    if (assigned_user_id !== null && assigned_user_id !== undefined && !ObjectId.isValid(assigned_user_id))
    {
        return res.status(400).json({message: "Invalid Assigned Member."});
    }

    try
    {
        const db = client.db("pa2");
        const projects = db.collection("Projects");
        const users = db.collection("users");
        const memberships = db.collection("ProjectMemberships");
        const stories = db.collection("UserStories");
        const projectObjectId = new ObjectId(projectId);
        const project = await projects.findOne({_id: projectObjectId});

        if (project === null)
        {
            return res.status(404).json({message: "Project does not exist."});
        }

        let assignedId = null;

        if (assigned_user_id)
        {
            assignedId = new ObjectId(assigned_user_id);

            const user = await users.findOne({ _id: assignedId});

            if (user === null)
            {
                return res.status(404).json({message: "Assigned user does not exist."});
            }

            const membership = await memberships.findOne({
                project_id: projectObjectId,
                user_id: assignedId
            });

            if (membership === null && !project.project_lead_id.equals(assignedId))
            {
                return res.status(400).json({message: "User is not a member of this project."});
            }
        }

        await stories.insertOne({
            project_id: projectObjectId,
            title: title.trim(),
            description: description.trim(),
            priority: priority,
            status: "To Do",
            assigned_user_id: assignedId
        });

        res.status(201).json({
            message: "User story created successfully!"
        });
    }
    catch (error)
    {
        console.error(error);

        res.status(500).json({message: "Server error."});
    }
});


app.put("/projects/:projectId/stories/:storyId", async (req, res) =>
{
    const { projectId, storyId } = req.params;
    const { title, description, priority, status, assigned_user_id } = req.body;

    if (!ObjectId.isValid(projectId) || !ObjectId.isValid(storyId))
    {
        return res.status(400).json({message: "Invalid Project ID or Story ID."});
    }

    if (typeof title !== "string" || !title.trim() ||
        typeof description !== "string" || !description.trim() ||
        !["High", "Medium", "Low"].includes(priority) ||
        !["To Do", "In Progress", "Done"].includes(status))
    {
        return res.status(400).json({message: "Missing or invalid story information."});
    }

    if (assigned_user_id !== null && assigned_user_id !== undefined &&
        (typeof assigned_user_id !== "string" || !ObjectId.isValid(assigned_user_id)))
    {
        return res.status(400).json({message: "Invalid Assigned Member."});
    }

    try
    {
        const db = client.db("pa2");
        const projects = db.collection("Projects");
        const stories = db.collection("UserStories");
        const users = db.collection("users");
        const memberships = db.collection("ProjectMemberships");

        const projectObjectId = new ObjectId(projectId);
        const storyObjectId = new ObjectId(storyId);

        const project = await projects.findOne({_id: projectObjectId});

        if (project === null)
        {
            return res.status(404).json({message: "Project does not exist."});
        }

        const story = await stories.findOne({
            _id: storyObjectId,
            project_id: projectObjectId
        });

        if (story === null)
        {
            return res.status(404).json({message: "Story does not exist in this project."});
        }

        let assignedId = null;

        if (assigned_user_id)
        {
            assignedId = new ObjectId(assigned_user_id);

            const user = await users.findOne({_id: assignedId});

            if (user === null)
            {
                return res.status(404).json({message: "Assigned user does not exist."});
            }

            const membership = await memberships.findOne({
                project_id: projectObjectId,
                user_id: assignedId
            });

            if (membership === null && !project.project_lead_id.equals(assignedId))
            {
                return res.status(400).json({message: "User is not a member of this project."});
            }
        }

        await stories.updateOne(
            {
                _id: storyObjectId,
                project_id: projectObjectId
            },
            {
                $set: {
                    title: title.trim(),
                    description: description.trim(),
                    priority: priority,
                    status: status,
                    assigned_user_id: assignedId
                }
            }
        );

        res.status(200).json({message: "User story updated successfully!"});
    }
    catch (error)
    {
        console.error(error);

        res.status(500).json({message: "Server error."});
    }
});


app.delete("/projects/:projectId/stories/:storyId", async (req, res) =>
{
    const { projectId, storyId } = req.params;

    if (!ObjectId.isValid(projectId) || !ObjectId.isValid(storyId))
    {
        return res.status(400).json({message: "Invalid Project ID or Story ID."});
    }

    try
    {
        const db = client.db("pa2");
        const projects = db.collection("Projects");
        const stories = db.collection("UserStories");

        const projectObjectId = new ObjectId(projectId);
        const storyObjectId = new ObjectId(storyId);

        const project = await projects.findOne({_id: projectObjectId});

        if (project === null)
        {
            return res.status(404).json({message: "Project does not exist."});
        }

        const result = await stories.deleteOne({
            _id: storyObjectId,
            project_id: projectObjectId
        });

        if (result.deletedCount === 0)
        {
            return res.status(404).json({message: "Story does not exist in project."});
        }

        res.status(200).json({message: "User story deleted successfully!"});
    }
    catch (error)
    {
        console.error(error);

        res.status(500).json({message: "Server error."});
    }
});

connectDatabase();

app.listen(9000, () => {
    console.log("Server running on port 9000");
});
import { useState, useEffect } from "react";

function UserStories()
{
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState("");
    const [members, setMembers] = useState([]);
    const [stories, setStories] = useState([]);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState("Medium");
    const [assignedUser, setAssignedUser] = useState("");

    const [editingStory, setEditingStory] = useState("");
    const [status, setStatus] = useState("To Do");
    const [viewStory, setViewStory] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() =>
    {
        async function getProjects()
        {
            try
            {
                const response = await fetch("http://localhost:9000/projects");
                const data = await response.json();

                if (response.ok)
                {
                    setProjects(data);
                }
            }
            catch (error)
            {
                console.error("An error occurred while getting projects:", error);
            }
        }

        getProjects();
    }, []);

    useEffect(() =>
    {
        async function getProjectData()
        {
            if (!selectedProject)
            {
                setMembers([]);
                setStories([]);
                return;
            }

            setMembers([]);
            setStories([]);

            try
            {
                const membersResponse = await fetch(
                    `http://localhost:9000/projects/${selectedProject}/members`
                );

                const membersData = await membersResponse.json();

                if (membersResponse.ok)
                {
                    setMembers(membersData);
                }

                const storiesResponse = await fetch(
                    `http://localhost:9000/projects/${selectedProject}/stories`
                );

                const storiesData = await storiesResponse.json();

                if (storiesResponse.ok)
                {
                    setStories(storiesData);
                }
                else
                {
                    setMessage(storiesData.message);
                }
            }
            catch (error)
            {
                console.error(error);
                setMessage("Error connecting to server.");
            }
        }

        getProjectData();
    }, [selectedProject]);

    async function getStories()
    {
        try
        {
            const response = await fetch(
                `http://localhost:9000/projects/${selectedProject}/stories`
            );

            const data = await response.json();

            if (response.ok)
            {
                setStories(data);
            }
            else
            {
                setMessage(data.message);
            }
        }
        catch (error)
        {
            console.error(error);
            setMessage("Error connecting to server.");
        }
    }

    function clearForm()
    {
        setTitle("");
        setDescription("");
        setPriority("Medium");
        setAssignedUser("");
        setStatus("To Do");
        setEditingStory("");
    }

    function handleProjectChange(e)
    {
        setSelectedProject(e.target.value);
        setMembers([]);
        setStories([]);
        setViewStory("");
        setMessage("");
        clearForm();
    }

    async function handleCreateStory()
    {
        if (!title.trim() || !description.trim())
        {
            setMessage("Title and description are required.");
            return;
        }

        try
        {
            const response = await fetch(
                `http://localhost:9000/projects/${selectedProject}/stories`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        title: title,
                        description: description,
                        priority: priority,
                        assigned_user_id: assignedUser || null
                    })
                }
            );

            const data = await response.json();
            setMessage(data.message);

            if (response.ok)
            {
                clearForm();
                await getStories();
            }
        }
        catch (error)
        {
            console.error(error);
            setMessage("Error connecting to server.");
        }
    }

    function handleEditStory(story)
    {
        setEditingStory(story._id);
        setTitle(story.title);
        setDescription(story.description);
        setPriority(story.priority);
        setStatus(story.status);
        setAssignedUser(story.assigned_user_id || "");
        setViewStory("");
        setMessage("");
    }

    async function handleSaveStory()
    {
        if (!title.trim() || !description.trim())
        {
            setMessage("Title and description are required.");
            return;
        }

        try
        {
            const response = await fetch(
                `http://localhost:9000/projects/${selectedProject}/stories/${editingStory}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        title: title,
                        description: description,
                        priority: priority,
                        status: status,
                        assigned_user_id: assignedUser || null
                    })
                }
            );

            const data = await response.json();
            setMessage(data.message);

            if (response.ok)
            {
                clearForm();
                await getStories();
            }
        }
        catch (error)
        {
            console.error(error);
            setMessage("Error connecting to server.");
        }
    }

    async function handleDeleteStory(storyId)
    {
        const confirmed = window.confirm("Are you sure you want to delete this story?");

        if (!confirmed)
        {
            return;
        }

        try
        {
            const response = await fetch(
                `http://localhost:9000/projects/${selectedProject}/stories/${storyId}`,
                {
                    method: "DELETE"
                }
            );

            const data = await response.json();
            setMessage(data.message);

            if (response.ok)
            {
                setViewStory("");

                if (editingStory === storyId)
                {
                    clearForm();
                }

                await getStories();
            }
        }
        catch (error)
        {
            console.error(error);
            setMessage("Error connecting to server.");
        }
    }

    return (
        <div>
            <h2>User Stories and Project Backlog</h2>

            <select value={selectedProject} onChange={handleProjectChange}>
                <option value="">Select Project</option>

                {projects.map((project) => (
                    <option key={project._id} value={project._id}>
                        {project.name}
                    </option>
                ))}
            </select>

            {selectedProject && (
                <div>
                    <h3>{editingStory ? "Edit User Story" : "Create User Story"}</h3>

                    <input
                        type="text"
                        placeholder="Story Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />

                    <br />

                    <textarea
                        placeholder="As a [type of user], I want [goal], so that [benefit]..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />

                    <br />

                    <label>Priority: </label>
                    <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>

                    <br />

                    <label>Assigned Member: </label>
                    <select value={assignedUser} onChange={(e) => setAssignedUser(e.target.value)}>
                        <option value="">Unassigned</option>

                        {members.map((member) => (
                            <option key={member._id} value={member._id}>
                                {member.name}
                            </option>
                        ))}
                    </select>

                    <br />

                    {editingStory && (
                        <div>
                            <label>Status: </label>
                            <select value={status} onChange={(e) => setStatus(e.target.value)}>
                                <option value="To Do">To Do</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Done">Done</option>
                            </select>
                        </div>
                    )}

                    {editingStory ? (
                        <div>
                            <button type="button" onClick={handleSaveStory}>
                                Save Changes
                            </button>

                            <button type="button" onClick={() => {
                                clearForm();
                                setMessage("");
                            }}>
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button type="button" onClick={handleCreateStory}>
                            Create Story
                        </button>
                    )}

                    <p>{message}</p>

                    <h3>Project Backlog</h3>

                    {stories.length === 0 && (
                        <p>No user stories found for this project.</p>
                    )}

                    {stories.map((story) => (
                        <div key={story._id}>
                            <h4>{story.title}</h4>

                            <p>Priority: {story.priority}</p>
                            <p>Status: {story.status}</p>
                            <p>Assigned Member: {story.assigned_member_name}</p>

                            <button type="button" onClick={() => {
                                if (viewStory === story._id)
                                {
                                    setViewStory("");
                                }
                                else
                                {
                                    setViewStory(story._id);
                                }
                            }}>
                                View Details
                            </button>

                            {viewStory === story._id && (
                                <p>Description: {story.description}</p>
                            )}

                            <button type="button" onClick={() => handleEditStory(story)}>
                                Edit
                            </button>

                            <button type="button" onClick={() => handleDeleteStory(story._id)}>
                                Delete
                            </button>

                            <hr />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default UserStories;
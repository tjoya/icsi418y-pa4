import './App.css'
import Signup from './components/Signup'
import Login from './components/Login'
import CreatePro from "./CreatePro";
import ViewPro from './ViewPro'
import ProjectMembership from './ProjectMembership'
import UserStories from "./UserStories";

function App() {
  return (
    <>
      <Signup />
      <Login />
      <CreatePro />
      <ViewPro />
      <ProjectMembership />
      <UserStories />
    </>
  )
}

export default App
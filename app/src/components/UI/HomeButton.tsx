import { useNavigate } from "react-router-dom";
import { Button } from "antd";

export default function HomeButton() {
  const navigate = useNavigate();

  function handleClick() {
    navigate(-1);
  }

  return (
    <Button type="primary" onClick={handleClick}>
      Retry
    </Button>
  );
}




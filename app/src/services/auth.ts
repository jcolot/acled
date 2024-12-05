import { useEffect, useState } from "react";
import { shouldSkipAuth } from "../App";

export const useUser = () => {
  const [user, setUser] = useState();
  useEffect(() => {
    if (shouldSkipAuth) return;
    // Auth.currentAuthenticatedUser().then((user) => {
    //   const groups = user.signInUserSession.accessToken.payload["cognito:groups"];
    //   if (groups?.indexOf("developers") > -1) {
    //     user.attributes.featureFlagAccess = true;
    //   } else {
    //     user.attributes.featureFlagAccess = false;
    //   }
    //   setUser(user.attributes);
    // });
  }, []);
  return user || {};
};

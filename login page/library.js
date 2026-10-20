class Methods {
  async postLogin(url, body) {
    console.log("ishladi", body);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return data;
  }

  async getProfile(url) {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      },
    });

    const data = await response.json();
    
    return data;
  }
}

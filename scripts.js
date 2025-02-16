document.addEventListener("DOMContentLoaded", function () {
  console.log("Chart.js version:", Chart?.version || "Chart.js not loaded!");

  // Ensure Chart.js is loaded
  if (typeof Chart === "undefined") {
    console.error("Chart.js not loaded!");
    return;
  }

  let nutrientChart;

  function initializeNutrientChart() {
    const canvas = document.getElementById("nutrientChart");

    if (!canvas) {
      console.error("NutrientChart canvas not found!");
      return;
    }

    console.log("Found canvas for Nutrient Chart!");

    const ctx = canvas.getContext("2d");

    if (nutrientChart) {
      nutrientChart.destroy();
    }

    console.log("Creating new Nutrient Chart...");

    nutrientChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Carbohydrates", "Proteins", "Fats", "Sugars", "Fiber"],
        datasets: [
          {
            data: [0, 0, 0], // Should be updated later
            backgroundColor: [
              "#FF6384",
              "#36A2EB",
              "#FFCE56",
              "#4BC0C0",
              "#9966FF",
            ],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top" },
        },
      },
    });

    console.log("Nutrient Chart initialized successfully");
  }

  function updateNutrientChart() {
    if (!nutrientChart) {
      console.warn("Chart is not initialized yet. Initializing now...");
      initializeNutrientChart();
    }

    let totalCarbs = 0;
    let totalProteins = 0;
    let totalFats = 0;
    let totalsuger = 0;
    let totalfiber = 0;

    ["breakfast", "lunch", "dinner"].forEach((meal) => {
      const selectedMeal = document.getElementById(meal);
      if (selectedMeal && selectedMeal.value) {
        try {
          console.log(`🔄 Parsing value for ${meal}:`, selectedMeal.value);
          const mealData = JSON.parse(selectedMeal.value);

          totalCarbs += parseFloat(mealData.carbs) || 0;
          totalProteins += parseFloat(mealData.proteins) || 0;
          totalFats += parseFloat(mealData.fats) || 0;
          totalsuger += parseFloat(mealData.sugars) || 0;
          totalfiber += parseFloat(mealData.fiber) || 0;
        } catch (error) {
          console.error(`Error parsing meal data for ${meal}:`, error);
        }
      }
    });

    console.log("Final values to update chart:", {
      totalCarbs,
      totalProteins,
      totalFats,
      totalfiber,
      totalsuger,
    });

    if (nutrientChart) {
      nutrientChart.data.datasets[0].data = [
        totalCarbs,
        totalProteins,
        totalFats,
        totalsuger,
        totalfiber,
      ];
      nutrientChart.update();
    }
  }

  async function fetchMealData() {
    try {
      const response = await fetch("http://127.0.0.1:5000/get-meals");
      if (!response.ok)
        throw new Error(`HTTP error! Status: ${response.status}`);

      const mealData = await response.json();
      console.log("Fetched meal data:", mealData);
      populateDropdowns(mealData);

      initializeNutrientChart();
      initializeChart(2000); // Ensure calorie chart initializes early

      // Force chart update after 2 seconds
      setTimeout(updateChart, 2000);
    } catch (error) {
      console.error("Failed to fetch meal data:", error);
      initializeNutrientChart();
    }
  }

  function populateDropdowns(mealData) {
    console.log("Populating dropdowns with meal data...");

    ["breakfast", "lunch", "dinner"].forEach((meal) => {
      const mealSelect = document.getElementById(meal);
      if (mealSelect) {
        mealSelect.innerHTML = "<option value=''>Select a meal</option>";

        mealData.forEach((item) => {
          console.log(`Setting value for ${meal}:`, item);

          const option = document.createElement("option");
          option.value = JSON.stringify({
            carbs: item.CarbohydrateContent || 0,
            sugars: item.SugarContent || 0,
            fiber: item.FiberContent || 0,
            proteins: item.ProteinContent || 0,
            fats: item.FatContent || 0,
            calories: item.Calories || 0, // Include calories
          });

          option.textContent = `${item.Name} - ${item.Calories} cal`;
          mealSelect.appendChild(option);
        });
      } else {
        console.error(`Dropdown for ${meal} not found!`);
      }
    });

    console.log("Meal dropdowns populated successfully");
  }

  // Responsive Design

  function adjustLayout() {
    const mainContainer = document.querySelector("main");
    const formElements = document.querySelectorAll("input, select, button");
    const formSections = document.querySelectorAll(".form-section");

    // Adjust layout based on screen width
    if (window.innerWidth <= 768) {
      formElements.forEach((element) => {
        element.style.padding = "0.65rem";
        element.style.fontSize = "0.9rem";
      });
      mainContainer.style.padding = "1.5rem";
      formSections.forEach((section) => {
        section.style.marginBottom = "1rem";
      });
    } else {
      // Larger screens: reset to default styles
      formElements.forEach((element) => {
        element.style.padding = "0.75rem";
        element.style.fontSize = "1rem";
      });
      mainContainer.style.padding = "2rem";
      formSections.forEach((section) => {
        section.style.marginBottom = "1.5rem";
      });
    }
  }

  // Call the function on load to apply initial styles
  adjustLayout();

  // Adjust layout on window resize
  window.addEventListener("resize", adjustLayout);

  // Bmr and Bmi calculation when the button is clicked
  document
    .getElementById("calculate-bmi-bmr")
    .addEventListener("click", function () {
      const height = parseFloat(document.getElementById("height").value) / 100; // Convert cm to meters
      const weight = parseFloat(document.getElementById("weight").value);
      const age = parseInt(document.getElementById("age").value);
      const gender = document.getElementById("gender").value;
      const activity = document.getElementById("activity").value;
      const diet = document.getElementById("diet").value;
      if (height > 0 && weight > 0 && age > 0) {
        //Bmi Calculation
        const bmi = (weight / (height * height)).toFixed(2);
        let category =
          bmi < 18.5
            ? "Underweight"
            : bmi <= 24.9
            ? "Balanced Weight"
            : "Overweight";
        document.getElementById(
          "bmi-result"
        ).innerHTML = `<strong>Your BMI:</strong> ${bmi} (${category})`;

        // Bmr Calculation
        let bmr =
          gender === "male"
            ? 88.362 + 13.397 * weight + 4.799 * (height * 100) - 5.677 * age
            : 447.593 + 9.247 * weight + 3.098 * (height * 100) - 4.33 * age;

        const activityMultiplier = {
          sedentary: 1.2,
          moderate: 1.55,
          active: 1.725,
        };
        const dailyCalories = (bmr * activityMultiplier[activity]).toFixed(2);
        recommendedCalories = (bmr * activityMultiplier[activity]).toFixed(2);
        document.getElementById(
          "bmr-result"
        ).innerHTML = `<strong>Your BMR:</strong> ${bmr.toFixed(
          2
        )} cal/day<br><strong>Recommended Intake:</strong> ${dailyCalories} cal/day`;
        // Pass calculated dailyCalories to initialize and update chart
        initializeChart(dailyCalories);
        updateChart(dailyCalories);
      } else {
        document.getElementById(
          "bmi-result"
        ).innerHTML = `<span style="color:red;">Please enter valid values for height, weight, and age.</span>`;
        document.getElementById("bmr-result").innerHTML = "";
      }
    });

  // Meals Recommendation Is fetched when Get recommendation is clicked
  document
    .getElementById("diet-form")
    .addEventListener("submit", async function (event) {
      event.preventDefault();
      document.getElementById("loading-spinner").style.display = "block";

      const height = parseFloat(document.getElementById("height").value) / 100;
      const weight = parseFloat(document.getElementById("weight").value);
      const age = parseInt(document.getElementById("age").value);
      const gender = document.getElementById("gender").value;
      const activity = document.getElementById("activity").value;
      const diet = document.getElementById("diet").value;
      let bmr =
        gender === "male"
          ? 88.362 + 13.397 * weight + 4.799 * (height * 100) - 5.677 * age
          : 447.593 + 9.247 * weight + 3.098 * (height * 100) - 4.33 * age;

      const activityMultiplier = {
        sedentary: 1.2,
        moderate: 1.55,
        active: 1.725,
      };
      const dailyCalories = (bmr * activityMultiplier[activity]).toFixed(2);

      const formData = {
        name: document.getElementById("name").value,
        age,
        gender,
        activity,
        goal: document.getElementById("goal").value,
        height: height * 100,
        weight,
        diet,
      };

      try {
        const response = await fetch("http://127.0.0.1:5000/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Server Error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        displayRecommendations(result, dailyCalories);
        populateDropdowns(result.recommendations);
      } catch (error) {
        console.error("Error fetching recommendations:", error);
        document.getElementById(
          "recommendations"
        ).innerHTML = `<p style='color: red;'>Error: ${error.message}</p>`;
      } finally {
        document.getElementById("loading-spinner").style.display = "none";
      }
    });

  //Display Output
  function displayRecommendations(result, dailyCalories) {
    let recommendationsDiv = document.getElementById("recommendations");
    recommendationsDiv.innerHTML = `
      <h3>Recommended Meals</h3>
      <p>Your Daily Calorie Goal: <strong>${dailyCalories}</strong> cal</p>
  `;

    Object.entries(result.recommendations).forEach(([meal, recipes]) => {
      recommendationsDiv.innerHTML += `<h4>${meal}</h4><div class="meal-container">`;

      recipes.forEach((recipe) => {
        let mealCard = document.createElement("div");
        mealCard.classList.add("meal-card");

        mealCard.innerHTML = `
              <img src="${recipe.Images}" alt="${
          recipe.Name
        }" class="meal-image" 
                  onerror="this.onerror=null; this.src='default.jpg';">
              <div class="meal-info">
                  <h5>${recipe.Name}(${recipe.DietType})</h5>
                  <p><strong>Calories:</strong> ${recipe.Calories}cal</p>
                  <p><strong>Ingredients:</strong> ${
                    recipe.RecipeIngredientParts
                  }</p>
                  <p><strong>Instructions:</strong> ${recipe.RecipeInstructions.replace(
                    /\.\s/g,
                    ".<br>"
                  )}</p>
              </div>
          `;
        recommendationsDiv.appendChild(mealCard);
      });

      recommendationsDiv.innerHTML += `</div>`;
    });

    document.getElementById("meal-selection").style.display = "block";
  }

  let calorieChart = null;

  function initializeChart(recommendedCalories) {
    const ctx = document.getElementById("calorieChart").getContext("2d");

    if (calorieChart) calorieChart.destroy(); // Destroy previous chart

    console.log(
      "Initializing Calorie Chart with recommended calories:",
      recommendedCalories
    );

    calorieChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Selected Calories", "Recommended Calories"],
        datasets: [
          {
            label: "Calories",
            data: [0, recommendedCalories], // Use stored value
            backgroundColor: ["#FF6B6B", "#4CAF50"],
          },
        ],
      },
      options: { responsive: true, scales: { y: { beginAtZero: true } } },
    });
  }

  function updateChart() {
    if (!calorieChart) {
      console.warn("Calorie Chart is not initialized. Initializing now...");
      initializeChart(recommendedCalories);
    }

    let totalCalories = 0;

    ["breakfast", "lunch", "dinner"].forEach((meal) => {
      const selectedMeal = document.getElementById(meal);
      if (selectedMeal && selectedMeal.value) {
        try {
          console.log(`🔄 Parsing value for ${meal}:`, selectedMeal.value);
          const mealData = JSON.parse(selectedMeal.value);
          totalCalories += parseFloat(mealData.calories) || 0;
        } catch (error) {
          console.error(`❌ Error parsing meal data for ${meal}:`, error);
        }
      }
    });

    console.log("🔥 Updating Chart - Selected Calories:", totalCalories);
    console.log(
      "🔥 Updating Chart - Recommended Calories:",
      recommendedCalories
    );

    if (calorieChart) {
      calorieChart.data.datasets[0].data = [totalCalories, recommendedCalories];
      calorieChart.update();
      console.log("✅ Calorie Chart updated successfully");
    }
  }

  function populateDropdowns(recommendations) {
    ["Breakfast", "Lunch", "Dinner"].forEach((mealType) => {
      let selectElement = document.getElementById(mealType.toLowerCase());
      selectElement.innerHTML = "<option value=''>Select a meal</option>";
      if (recommendations && recommendations[mealType]) {
        recommendations[mealType].forEach((meal) => {
          let option = document.createElement("option");
          option.value = JSON.stringify({
            carbs: meal.CarbohydrateContent || 0,
            proteins: meal.ProteinContent || 0,
            fats: meal.FatContent || 0,
            sugars: meal.SugarContent || 0,
            fiber: meal.FiberContent || 0,
            calories: meal.Calories || 0,
            dietType: meal.DietType || "Unknown",
          });
          option.textContent = `${meal.Name} - ${meal.Calories} cal (${meal.DietType})`;
          selectElement.appendChild(option);
        });
      }
    });

    // Ensure chart updates when a meal is selected
    ["breakfast", "lunch", "dinner"].forEach((id) => {
      document.getElementById(id).addEventListener("change", function () {
        updateNutrientChart();
        updateChart(); // ✅ Keeps recommendedCalories value
      });
    });
  }

  function displayRecommendations(result, dailyCalories) {
    let recommendationsDiv = document.getElementById("recommendations");

    // Clear previous content
    recommendationsDiv.innerHTML = `
      <div style="border: 2px solid #4CAF50; padding: 1rem; border-radius: 8px; background-color: #f0fff0;">
          <h2 style="color: #4CAF50; text-align: center;">Your Daily Calorie Requirement (BMR): ${dailyCalories} calories</h2>
          <h3 style="color: #388E3C; text-align: center;">Meal Recommendations</h3>
          <div style="display: flex; justify-content: space-around; flex-wrap: wrap;">
  `;

    Object.entries(result.recommendations).forEach(([meal, recipes]) => {
      recommendationsDiv.innerHTML += `
          <div style="width: 30%; padding: 1rem; border: 1px solid #ddd; border-radius: 10px; text-align: center; background: #ffffff; box-shadow: 2px 2px 10px rgba(0,0,0,0.1);">
              <h4 style="color: #2E7D32;">${meal}</h4>
              ${
                Array.isArray(recipes)
                  ? recipes
                      .map(
                        (recipe) => `
                  <details>
                      <summary style="color: #4CAF50; font-weight: bold; cursor: pointer;">
                          ${recipe.Name} <span style="color: #ff5722;">(${
                          recipe.Calories
                        } cal)</span>
                      </summary>
                      <img src="${recipe.Images}" alt="${
                          recipe.Name
                        }" width="100" height="100"
                          onerror="this.onerror=null; this.src='default.jpg';" style="border-radius: 10px; margin: 5px 0;">
                      
                      <p><strong>Nutritional Values (g):</strong></p>
                      <table style="width: 100%; border-collapse: collapse; text-align: left;">
                          
                          <tr><td>Fat:</td><td>${recipe.FatContent}</td></tr>
                          <tr><td>Protein:</td><td>${
                            recipe.ProteinContent
                          }</td></tr>
                          <tr><td>Carbs:</td><td>${
                            recipe.CarbohydrateContent
                          }</td></tr>
                          <tr><td>Sugars:</td><td>${
                            recipe.SugarContent
                          }</td></tr>
                          <tr><td>Fiber:</td><td>${
                            recipe.FiberContent
                          }</td></tr>
                      </table>
                      <p><strong>Ingredients:</strong> ${
                        recipe.RecipeIngredientParts
                      }</p>
                      <p><strong>Instructions:</strong> <pre style="white-space: pre-wrap;">${recipe.RecipeInstructions.replace(
                        /\.\s/g,
                        ".\n"
                      )}</pre></p>
                  </details>
              `
                      )
                      .join("")
                  : `<p style="color: red;">${recipes}</p>`
              }
          </div>
      `;
    });

    recommendationsDiv.innerHTML += "</div></div>";
    populateDropdowns(result.recommendations, dailyCalories);

    // Show the meal selection UI
    document.getElementById("meal-selection").style.display = "block";
  }
});

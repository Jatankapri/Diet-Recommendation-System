$(document).ready(function () {
    fetchMeals();
});

function fetchMeals() {
    $.get("/index", function (data) {
        if (data.meals.length === 0) {
            $("#meal-table-body").html("<tr><td colspan='4' class='text-center'>No meals saved.</td></tr>");
            return;
        }

        let rows = "";
        data.meals.forEach(meal => {
            rows += `
                <tr>
                    <td>${meal.name}</td>
                    <td>${meal.calories} kcal</td>
                    <td>${meal.ingredients}</td>
                    <td>${meal.date}</td>
                </tr>
            `;
        });
        $("#meal-table-body").html(rows);
    }).fail(function () {
        $("#meal-table-body").html("<tr><td colspan='4' class='text-center text-danger'>Failed to load meals.</td></tr>");
    });
}
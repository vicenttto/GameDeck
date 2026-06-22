package com.tfg.gamelist.activity.controller;

import com.tfg.gamelist.activity.dto.ActivityEventResponse;
import com.tfg.gamelist.activity.service.ActivityService;
import com.tfg.gamelist.user.entity.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class ActivityController {

    private final ActivityService activityService;

    public ActivityController(ActivityService activityService) {
        this.activityService = activityService;
    }

    @GetMapping("/api/users/{username}/activity")
    public List<ActivityEventResponse> getActivity(
            @PathVariable String username,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return activityService.getActivity(username, page, size);
    }

    @DeleteMapping("/api/me/activity")
    public ResponseEntity<Void> deleteActivity(
            @RequestBody List<Long> ids,
            @AuthenticationPrincipal User user) {
        activityService.deleteEvents(user, ids);
        return ResponseEntity.noContent().build();
    }
}
